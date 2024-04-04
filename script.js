//@ts-check
"use strict";

/**
 * ## Calculates the iteration count for the given position in the mandelbrot set
 * @param {number} real - position on the real axis
 * @param {number} imag - position on the complex axis
 * @param {number} maxI - max iteration count (integer >= 1)
 * @param {0|1|2} [variance] - [optional] `0` normal / `1` spiky / `2` tubes - defaults to normal
 * @returns {number} iteration count [1-{@linkcode maxI}] (assume clipping when the result is exactly {@linkcode maxI})
 */
const mandelbrot=(real,imag,maxI,variance)=>{
    "use strict";
    let i=1;
    switch(variance){
        case 0:for(let cr=real,ci=imag;i<maxI&&cr*cr+ci*ci<8;i++)[cr,ci]=[(cr*cr-ci*ci)+real,2*cr*ci+imag];break;
        case 1:for(let cr=real,ci=imag;i<maxI&&cr*ci<3;i++)[cr,ci]=[(cr*cr-ci*ci)+real,2*cr*ci+imag];break;
        case 2:for(let cr=real,ci=imag;i<maxI&&cr+ci>-3;i++)[cr,ci]=[(cr*cr-ci*ci)+real,2*cr*ci+imag];break;
    }
    return i;
};
/**
 * ## Maps {@linkcode n} from range [{@linkcode x}-{@linkcode y}] to range [{@linkcode x2}-{@linkcode y2}]
 * @param {number} n - given number
 * @param {number} x - start range of {@linkcode n}
 * @param {number} y - end range of {@linkcode n}
 * @param {number} x2 - start range for output
 * @param {number} y2 - end range for output
 * @returns {number} maped number
 */
const map=(n,x,y,x2,y2)=>{
    "use strict";
    const yx=y-x;
    return((n-x)*(y2-x2)+yx*x2)/yx;
};
/**
 * ## Translates hue to RGB
 * @param {number} hue - hue in range [0-1] (float)
 * @returns {[number,number,number]} `[R, G, B]` in range [0-255] (float)
 *///@ts-ignore map() does not change the size of the array
const hueToRGB=hue=>[1/3,0,-1/3].map(v=>{
    "use strict";
    const t=(n=>n<0?n+1:n>1?n-1:n)(hue+v);
    if(t<1/6)return t*0x5FA;
    if(t<.5)return 0xFF;
    if(t<2/3)return(2/3-t)*0x5FA;
    return 0;
});

const html=Object.freeze({
    /**@type {HTMLCanvasElement} main canvas*///@ts-ignore element does exist in DOM
    canvas:document.getElementById("canvas"),
    /**@type {HTMLCanvasElement} canvas for crosshair*///@ts-ignore element does exist in DOM
    cursor:document.getElementById("cursor"),
    /**@type {HTMLProgressElement} loading bar*///@ts-ignore element does exist in DOM
    loading:document.getElementById("loading"),
    /**@type {CanvasRenderingContext2D} 2d context for {@linkcode html.canvas}*///@ts-ignore element does exist in DOM & gets checked for NULL later on
    cnx:document.getElementById("canvas").getContext("2d"),
    /**@type {CanvasRenderingContext2D} 2d context for {@linkcode html.cursor}*///@ts-ignore element does exist in DOM & gets checked for NULL later on
    crx:document.getElementById("cursor").getContext("2d")
})
if(html.cnx==null||html.crx==null)throw"couldn't get canvas 2d context";

html.cnx.imageSmoothingEnabled=false;
html.crx.imageSmoothingEnabled=false;

const global=Object.freeze({
    render:new class{
        #pause=false;
        #break=false;
        #running=false;
        /**if a calculation/draw is currently running (or is not fully aborted yet)*/
        get running(){return this.#running;}
        /**pause currently running calculation/draw*/
        pause(){this.#pause=true;}
        /**resumes currently paused calculation/draw*/
        resume(){this.#pause=false;}
        /**aborts currently running calculation/draw*/
        break(){this.#break=true;}
        /**resets variables for next calculation/draw*/
        reset(){this.#break=(this.#pause=false);}
        /**indicates the start of a new calculation/draw*/
        start(){this.#running=true;}
        /**indicates the end of the current calculation/draw*/
        end(){this.#running=false;}
        /**call during calculation/draw for an opportunity to pause/resume/break*/
        async check(){
            "use strict";
            for(;this.#pause;await new Promise(E=>setTimeout(E,100)));
            return this.#break;
        }
    },
    mouse:Object.seal({
        /**@type {number} current mouse X position*/
        x:0,
        /**@type {number} current mouse Y position*/
        y:0,
        /**@type {boolean} `true` when mouse is currently moving (set to `false` after 1sec without moving)*/
        move:false,
        /**@type {number} timeout ID for {@linkcode global.mouse.move} delay*/
        moveTimeout:NaN,
        /**@type {NaN|0|1|2} `NaN` none / 0 left / 1 middle / 2 right*/
        button:NaN,
        /**@type {boolean} `true` when a mouse button is held down (see {@linkcode global.mouse.drag} on which element it started and {@linkcode global.mouse.dragX} and {@linkcode global.mouse.dragY} for the position)*/
        hold:false,
        /**@type {EventTarget|null} HTML element on which the dragging started and `null` when {@linkcode global.mouse.hold} is `false`*/
        drag:null,
        /**@type {number} mouse drag start X position (updated on `mousedown`)*/
        dragX:0,
        /**@type {number} mouse drag start Y position (updated on `mousedown`)*/
        dragY:0,
        /**@type {boolean} set to `true` on `mouseup` for showing the (clickable) zoom-in area ~ then `false`*/
        up:false,
        /**@type {number} mouse drag end X position (updated on `mouseup`)*/
        upX:0,
        /**@type {number} mouse drag end Y position (updated on `mouseup`)*/
        upY:0
    }),
    var:Object.seal({
        /**@type {number} timeout ID for resize delay*/
        resizeTimeout:NaN,
        /**@type {number} previous window width (physical pixels)*/
        resizeWidth:Math.trunc(window.innerWidth*window.devicePixelRatio),
        /**@type {number} previous window height (physical pixels)*/
        resizeHeight:Math.trunc(window.innerHeight*window.devicePixelRatio),
        /**@type {number} scale of {@linkcode html.canvas} - does not change resolution but influences coordinates when choosing area*/
        zoom:1,
        /**@type {number} horizontal offset of {@linkcode html.canvas} from left edge*/
        panX:0,
        /**@type {number} vertical offset of {@linkcode html.canvas} from top edge*/
        panY:0,
        /**@type {number} current value for {@linkcode draw} (parameter[0] `limit`)*/
        limit:200,
        /**@type {number} current value for {@linkcode draw} (parameter[1] `rmin`)*/
        rmin:-2,
        /**@type {number} current value for {@linkcode draw} (parameter[2] `rmax`)*/
        rmax:.6,
        /**@type {number} current value for {@linkcode draw} (parameter[3] `imin`)*/
        imin:-1.3,
        /**@type {number} current value for {@linkcode draw} (parameter[4] `imax`)*/
        imax:1.3,
        /**@type {[number,number,number]|null} current value for {@linkcode draw} (parameter[5] `color` _optional_)*/
        color:null,
        /**@type {number} current value for {@linkcode draw} (parameter[6] `cmin` _optional_)*/
        cmin:-1.3,
        /**@type {number} current value for {@linkcode draw} (parameter[7] `cmax` _optional_)*/
        cmax:1.99,
        /**@type {0|1|2} current value for {@linkcode draw} (parameter[8] `variance` _optional_)*/
        variance:0
    })
});

/**
 * ## Calculates the {@linkcode mandelbrot} set and draws it to {@linkcode html.cnx} ({@linkcode html.canvas}), updates {@linkcode html.loading}, and responds to {@linkcode global.render} signals
 * {@linkcode html.canvas.width} and {@linkcode html.canvas.height} should be modified to the same aspect ratio as {@linkcode imin} ↔ {@linkcode imax} and {@linkcode imin} ↔ {@linkcode imax} or the resulting image will be distorted\
 * _waits for a script-cycle each pixel, a full-cycle each row (after drawing), and can be stopped with {@linkcode global.render}_
 * @param {number} limit - limit for the mandelbrot algorithm
 * @param {number} rmin - start value of real part in mandelbrot set
 * @param {number} rmax - end value of real part in mandelbrot set
 * @param {number} imin - start value of imaginary part in mandelbrot set
 * @param {number} imax - end value of imaginary part in mandelbrot set
 * @param {[number,number,number]|null} [color] - [optional] color change (from {@linkcode cmin} to {@linkcode cmax}) via `null` hue or `[R,G,B]` (integer [0-255]) saturation - default via hue
 * @param {number} [cmin] - [optional] color range minimum (float) - default `0`
 * @param {number} [cmax] - [optional] color range maximum (float) - default `1`
 * @param {0|1|2} [variance] - [optional] mandelbrot appearance: `0` normal / `1` spiky / `2` tubes - defaults to normal
 */
const draw=async(limit,rmin,rmax,imin,imax,color,cmin,cmax,variance)=>{
    "use strict";
    global.render.start();
    html.loading.removeAttribute("value");
    html.loading.classList.remove("hide");
    await new Promise(E=>setTimeout(E,10));
    const pixelLine=new ImageData(html.canvas.width,1),
        partPixels=1/(html.canvas.width*html.canvas.height);
    cmin??=0;
    cmax??=1;
    // TODO switch row/col when height>width
    outer:for(let x=0,y=0;y<html.canvas.height;y++){
        for(x=0;x<html.canvas.width;x++){
            const value=mandelbrot(map(x,0,html.canvas.width-1,rmin,rmax),map(y,0,html.canvas.height-1,imin,imax),limit,variance);
            if(value<limit)
                if(color==null)pixelLine.data.set([...hueToRGB(map(value,1,limit,cmin,cmax)),0xFF],x*4);
                else pixelLine.data.set((saturation=>[...color.map(v=>v*saturation),0xFF])(map(value,1,limit,cmin,cmax)),x*4);
            else pixelLine.data[x*4+3]=0;
            html.loading.value=(y*html.canvas.width+x)*partPixels;
            await Promise.resolve();
            if(await global.render.check())break outer;
        }
        html.cnx.putImageData(pixelLine,0,y);
        await new Promise(E=>setTimeout(E,0));
        if(await global.render.check())break;
    }
    html.loading.classList.add("hide");
    global.render.end();
};
/**
 * ## Calls {@linkcode draw} with the values stored in {@linkcode global.var} with optional overrides
 * _does not change values in {@linkcode global.var}_
 * @param {number} [limit] - [optional] limit for the mandelbrot algorithm - defaults to {@linkcode global.var.limit}
 * @param {[number,number,number]|null} [color] - [optional] color change (from {@linkcode cmin} to {@linkcode cmax}) via `null` hue or `[R,G,B]` (integer [0-255]) saturation - defaults to {@linkcode global.var.color}
 * @param {number} [cmin] - [optional] color range minimum (float) - defaults to {@linkcode global.var.cmin}
 * @param {number} [cmax] - [optional] color range maximum (float) - defaults to {@linkcode global.var.cmax}
 * @param {0|1|2} [variance] - [optional] mandelbrot appearance: `0` normal / `1` spiky / `2` tubes - defaults to {@linkcode global.var.variance}
 */
const redraw=async(limit,color,cmin,cmax,variance)=>{
    "use strict";
    global.render.break();
    global.render.resume();
    for(;global.render.running;await new Promise(E=>setTimeout(E,0)));
    global.render.reset();
    await draw(
        limit??global.var.limit,
        global.var.rmin,
        global.var.rmax,
        global.var.imin,
        global.var.imax,
        color??global.var.color,
        cmin??global.var.cmin,
        cmax??global.var.cmax,
        variance??global.var.variance,
    );
};

window.requestAnimationFrame(function cursor(){
    "use strict";
    html.cursor.width=Math.trunc(window.innerWidth*window.devicePixelRatio);
    html.cursor.height=Math.trunc(window.innerHeight*window.devicePixelRatio);
    //~ crosshair
    if(global.mouse.move||global.mouse.hold){
        html.crx.lineWidth=1;
        html.crx.strokeStyle="#444";
        html.crx.moveTo(global.mouse.x,0);
        html.crx.lineTo(global.mouse.x,html.cursor.height);
        html.crx.stroke();
        html.crx.moveTo(0,global.mouse.y);
        html.crx.lineTo(html.cursor.width,global.mouse.y);
        html.crx.stroke();
    }
    //~ selection box
    if(global.mouse.hold||global.mouse.up){
        html.crx.fillStyle="#F904";
        html.crx.fillRect(
            Math.min(global.mouse.dragX,global.mouse.up?global.mouse.upX:global.mouse.x),
            Math.min(global.mouse.dragY,global.mouse.up?global.mouse.upY:global.mouse.y),
            Math.abs(global.mouse.dragX-(global.mouse.up?global.mouse.upX:global.mouse.x)),
            Math.abs(global.mouse.dragY-(global.mouse.up?global.mouse.upY:global.mouse.y))
        );
    }
    //~ coordinates
    // TODO mouse XY | (hold/up) start XY | (hold/up) WH
    window.requestAnimationFrame(cursor);
});

window.addEventListener("mousemove",ev=>{
    "use strict";
    global.mouse.x=ev.clientX*window.devicePixelRatio;
    global.mouse.y=ev.clientY*window.devicePixelRatio;
    global.mouse.move=true;
    clearTimeout(global.mouse.moveTimeout);
    global.mouse.moveTimeout=setTimeout(()=>global.mouse.move=false,1000);
},{passive:true});
window.addEventListener("mousedown",ev=>{
    "use strict";
    if(global.mouse.up)return;
    global.mouse.button=ev.button;
    global.mouse.hold=true;
    global.mouse.drag=ev.target;
    global.mouse.dragX=ev.clientX*window.devicePixelRatio;
    global.mouse.dragY=ev.clientY*window.devicePixelRatio;
},{passive:true});
window.addEventListener("mouseup",ev=>{
    "use strict";
    if(global.mouse.up)return;
    global.mouse.button=NaN;
    global.mouse.hold=false;
    global.mouse.drag=null;
    global.mouse.upX=ev.clientX*window.devicePixelRatio;
    global.mouse.upY=ev.clientY*window.devicePixelRatio;
    html.cursor.classList.toggle("click",global.mouse.up=ev.button===0&&(global.mouse.dragX-global.mouse.upX!==0&&global.mouse.dragY-global.mouse.upY!==0));
},{passive:true});

// TODO create function zoomIn() ~ select area (min 1*1), confirm, then call zoomIn() to handle (abort draw ?), get coordinates, rescale canvas and initiate new draw
html.cursor.addEventListener("click",async()=>{
    "use strict";
    global.render.break();
    global.render.resume();
    for(;global.render.running;await new Promise(E=>setTimeout(E,0)));
    global.render.reset();
    //~ zoom in to selected area (and update canvas size/aspect-ratio accordingly)
    const
        [cw,ch]=(z=>[html.canvas.width*z,html.canvas.height*z])(global.var.zoom*.5),
        [ww,wh]=(dpr=>[window.innerWidth*dpr,window.innerHeight*dpr])(window.devicePixelRatio*.5),
        [cl,cr]=(wwp=>[wwp-cw,wwp+cw])(ww+global.var.panX),
        [ct,cb]=(whp=>[whp-ch,whp+ch])(wh+global.var.panY),
        [ml,mr]=global.mouse.dragX<global.mouse.upX?[global.mouse.dragX,global.mouse.upX]:[global.mouse.upX,global.mouse.dragX],
        [mt,mb]=global.mouse.dragY<global.mouse.upY?[global.mouse.dragY,global.mouse.upY]:[global.mouse.upY,global.mouse.dragY],
        rmin=map(ml,cl,cr,global.var.rmin,global.var.rmax),
        rmax=map(mr,cl,cr,global.var.rmin,global.var.rmax),
        imin=map(mt,ct,cb,global.var.imin,global.var.imax),
        imax=map(mb,ct,cb,global.var.imin,global.var.imax),
        width=Math.trunc(window.innerWidth*window.devicePixelRatio),
        height=Math.trunc(window.innerHeight*window.devicePixelRatio);
    [html.canvas.width,html.canvas.height]=(sw=>sw>width?[width,(mb-mt)*(width/(mr-ml))]:[sw,height])((mr-ml)*(height/(mb-mt)));
    global.var.rmin=rmin;
    global.var.rmax=rmax;
    global.var.imin=imin;
    global.var.imax=imax;
    redraw();
    global.mouse.up=false;
    html.cursor.classList.remove("click");
},{passive:true});

window.addEventListener("resize",()=>{
    "use strict";
    global.render.pause();
    html.loading.removeAttribute("value");
    clearTimeout(global.var.resizeTimeout);
    global.var.resizeTimeout=setTimeout(async()=>{
        "use strict";
        const
            width=Math.trunc(window.innerWidth*window.devicePixelRatio),
            height=Math.trunc(window.innerHeight*window.devicePixelRatio),
            [newWidth,newHeight]=(scaleWidth=>scaleWidth>width?[width,html.canvas.height*(width/html.canvas.width)]:[scaleWidth,height])(html.canvas.width*(height/html.canvas.height));
        if(html.canvas.width!==newWidth||html.canvas.height!==newHeight){
            global.render.break();
            global.render.resume();
            for(;global.render.running;await new Promise(E=>setTimeout(E,0)));
            global.render.reset();
            html.canvas.width=newWidth;
            html.canvas.height=newHeight;
            redraw();
        }else global.render.resume();
        global.var.resizeWidth=width;
        global.var.resizeHeight=height;
    },500);
},{passive:true});

// TODO ~ override defaults from browser history or session storage (in that order)
global.render.reset();
html.canvas.width=html.canvas.height=Math.trunc(Math.min(window.innerWidth,window.innerHeight)*window.devicePixelRatio);
// global.var.limit=20;
// global.var.color=[0xFF,0,0];
// global.var.cmin=0;
// global.var.cmax=1;
// global.var.variance=1;
redraw();

// w*h :limit,color,cmin,cmax,variance: rmin,rmax,imin,imax
//// `${html.canvas.width}*${html.canvas.height} :${global.var.limit},${global.var.hueMin},${global.var.hueMax},${global.var.variance}: ${global.var.rmin},${global.var.rmax},${global.var.imin},${global.var.imax}`
// 456*934 :40,,,,1: -1.543859649122807,-1.087719298245614,-0.4561403508771931,0.47894736842105257
// 456*423 :40,,,,1: -1.2697123798918186,-1.269711317648577,-0.05364440711967647,-0.053643537040994095
// 456*415 :40,,,,1: -1.7119711824918802,-1.7103616834092463,-0.0007379682834486906,0.0007348129921448072
// 456*449 :1000,,,,1: -1.2633476816177294,-1.2612927316298181,-0.4091261394904118,-0.4070882372911135
// 461*654 :1000,,2,-8,1: -1.3491422102216521,-1.349123980122724,-0.06195093301182616,-0.061925031470704626

// TODO context-menu: save as PNG / image to clipboard / redraw / reset zoom / settings>dialog / css-checker>white,light,dark,black,off / mandelbrot-type>smooth(default),spiky,noodles (recalc) / css-smooth>off(default),low,medium,high / resolution>custom(edited in settings),1%,5%,10%,1/4,1/3,1/2,2/3,3/4,1:1,150%,200% / link to GitHub repo
// TODO > settings-dialog: pos (recalc new areas) / scale (recalc) / hue start,end (draw preview)
// TODO save mandelbrot values in typed f32array for faster rerendering when chaning color ?
// TODO use webworkers for each row ~ multithreading ? https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#dedicated_workers
// TODO mouse crosshair ~ draw box and click inside = zoom to that area ~ zoom out ? history of zoom steps [rectangle:posXY,minXY,maxXY] ~ undo/redo stack (also set browser history)
// TODO pan & zoom (only visual zoom no calculation) controls like in GIF-decoder
// TODO draw full screen ? base is still square (no redraw when resize larger window axis)
