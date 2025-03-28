//@ts-check
"use strict";

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
    const yx=y-x;
    return((n-x)*(y2-x2)+yx*x2)*yx**-1;
};
/**
 * ## Translates hue to RGB
 * @param {number} hue - hue in range [0-1] (float)
 * @returns {[number,number,number]} `[R, G, B]` in range [0-255] (float)
 *///@ts-ignore map() does not change the size of the array
const hueToRGB=hue=>[1/3,0,-1/3].map(v=>{
    const t=(n=>n<0?n+1:n>1?n-1:n)(hue+v);
    if(t<1/6)return t*0x5FA;
    if(t<.5)return 0xFF;
    if(t<2/3)return(2/3-t)*0x5FA;
    return 0;
});
/**
 * ## Formats a complex number
 * @param {number} real - real part of complex number
 * @param {number} imag - imaginary part of complex number
 * @returns {string} the formatted complex number
 */
const formatComplex=(real,imag)=>`${real<0?real:`+${real}`}${imag<0?imag:`+${imag}`}\u2148`;
/**
 * ## Calculate quotient and remainder from the division of two given numbers
 * @param {number} nom - nominator
 * @param {number} den - denominator
 * @returns {[number,number]} `[quotient,remainder]`
 */
const divQR=(nom,den)=>{
    const q=Math.trunc(nom/den);
    return[q,nom-(q*den)];
};

//#region HTML & global obj

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
    crx:document.getElementById("cursor").getContext("2d"),
    // TODO
})
if(html.cnx==null||html.crx==null)throw"couldn't get canvas 2d context";

const global=Object.freeze({
    /**@type {readonly((real:number,imag:number,limit:number)=>number)[]} ordered list of algorithms - assume result is [0-1] and clip at +-`Infinity` - also see {@linkcode global.defaults}*/
    algo:Object.freeze([
        (real,imag,limit)=>{//~ [0] Mandelbrot - smooth
            if(limit<=1)return limit;
            let i=1;
            for(let cr=real,ci=imag;i<limit&&cr*cr+ci*ci<8;++i)[cr,ci]=[(cr*cr-ci*ci)+real,2*cr*ci+imag];
            return i<limit?i/limit:Infinity;
        },
        (real,imag,limit)=>{//~ [1] Mandelbrot - spiky
            if(limit<=1)return limit;
            let i=1;
            for(let cr=real,ci=imag;i<limit&&cr*ci<3;++i)[cr,ci]=[(cr*cr-ci*ci)+real,2*cr*ci+imag];
            return i<limit?i/limit:Infinity;
        },
        (real,imag,limit)=>{//~ [2] Mandelbrot - noodles
            if(limit<=1)return limit;
            let i=1;
            for(let cr=real,ci=imag;i<limit&&cr+ci>-3;++i)[cr,ci]=[(cr*cr-ci*ci)+real,2*cr*ci+imag];
            return i<limit?i/limit:Infinity;
        },
        // TODO ? implement other algoorithms/plots
        // return real**2+imag**2;
        // return real**2-imag**2;
        // return Math.random()*maxI;
        // return Math.min(real+imag,maxI);
        // return Math.min(Math.abs(real*imag),maxI);
        // return Math.min(Math.exp(real*imag),maxI);
        // return Math.min(Math.hypot(real,imag),maxI);
        // return(Math.cos(real)+Math.cos(imag))*.5*maxI;
        // return(Math.atan(real)+Math.atan(imag))*.5*maxI;
        // return Math.atan2(imag,real)*maxI*(2*Math.PI)**-1;
    ]),
    // TODO ↓ see draw()
    /**@type {readonly["random","top2bottom"]} - render order ({@linkcode draw})*/
    order:Object.freeze(["random","top2bottom"]),
    /**@type {readonly Readonly<{limit:number,rmin:number,rmax:number,imin:number,imax:number,color:[number,number,number]|null,cmin:number,cmax:number}>[]} ordered list of default states for each {@linkcode global.algo} (same indecies)*/
    defaults:Object.freeze([
        Object.freeze({limit:200,rmin:-2,rmax:.6,imin:-1.3,imax:1.3,color:null,cmin:-1.3,cmax:1.99}),
        Object.freeze({limit:200,rmin:-2,rmax:.6,imin:-1.3,imax:1.3,color:null,cmin:-1.3,cmax:1.99}),
        Object.freeze({limit:200,rmin:-2,rmax:.6,imin:-1.3,imax:1.3,color:null,cmin:-1.3,cmax:1.99}),
        // TODO see todo above
    ]),
    render:new class{
        #pause=false;
        #break=false;
        #running=false;
        /**if a calculation/draw is currently running (or is not fully aborted yet)*/
        get running(){return this.#running;}
        /**if a calculation/draw is currently paused (not necessarily {@linkcode running})*/
        get paused(){return this.#pause;}
        /**pause currently running calculation/draw*/
        pause(){this.#pause=true;}
        /**resumes currently paused calculation/draw*/
        resume(){this.#pause=false;}
        /**toggle pause currently running calculation/draw (and returns current pause state)*/
        toggle(){return this.#pause=!this.#pause;}
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
        /**@type {boolean} `true` when a mouse button is held down (see {@linkcode global.mouse.dragX} and {@linkcode global.mouse.dragY} for the position)*/
        hold:false,
        /**@type {number} mouse drag start X position (updated on `mousedown`)*/
        dragX:0,
        /**@type {number} mouse drag start Y position (updated on `mousedown`)*/
        dragY:0,
        /**@type {number} mouse drag end X position (updated on `mouseup`)*/
        upX:0,
        /**@type {number} mouse drag end Y position (updated on `mouseup`)*/
        upY:0,
        /**@type {boolean} set to `true` on `mouseup` when a non-zero area was drawn/selected for zoom-in ~ set to `false` when used*/
        area:false
    }),
    state:Object.seal({
        /**@type {number} timeout ID for resize delay*/
        resizeTimeout:NaN,
        /**@type {number} current window width (physical pixels)*/
        winW:Math.trunc(window.innerWidth*window.devicePixelRatio),
        /**@type {number} current window height (physical pixels)*/
        winH:Math.trunc(window.innerHeight*window.devicePixelRatio),
        /**@type {number[]} pixel indecies for rendering in a random order ({@linkcode html.canvas.width} * {@linkcode html.canvas.height})*/
        randomOrder:[],
        /**@type {number} timeout ID for move delay*/
        moveTimeout:NaN,
        /**@type {number} scale of {@linkcode html.canvas} - does not change resolution but influences coordinates when choosing area*/
        zoom:1,
        /**@type {number} horizontal offset of {@linkcode html.canvas} from left edge*/
        panX:0,
        /**@type {number} vertical offset of {@linkcode html.canvas} from top edge*/
        panY:0,
        /**@type {number} - delay rendering (in {@linkcode draw}) every X pixels by one animation frame (v-sync)*/
        pixelDelay:window.screen.width*window.devicePixelRatio,
        /**@type {number} - index into {@linkcode global.algo} (and {@linkcode global.defaults})*/
        algo:0,
        /**@type {number} - index into {@linkcode global.order}*/
        order:0,
        /**@type {number} - limit for the current {@linkcode global.algo}*/
        limit:200,
        /**@type {number} - start value of real part for current {@linkcode global.algo} plot*/
        rmin:-2,
        /**@type {number} - end value of real part for current {@linkcode global.algo} plot*/
        rmax:.6,
        /**@type {number} - start value of imaginary part for current {@linkcode global.algo} plot*/
        imin:-1.3,
        /**@type {number} - end value of imaginary part for current {@linkcode global.algo} plot*/
        imax:1.3,
        /**@type {[number,number,number]|null} - color change (from {@linkcode cmin} to {@linkcode cmax}) via `null` hue or `[R,G,B]` (integer [0-255]) saturation*/
        color:null,
        /**@type {number} - color range minimum (float)*/
        cmin:-1.3,
        /**@type {number} - color range maximum (float)*/
        cmax:1.99
    })
});

//#region canvas/window size

/**
 * ## Set {@linkcode html.canvas} size, set global composite operation to `copy`, and disable image smoothing
 * only clears canvas when size is different and updates {@linkcode global.state.randomOrder}
 * @param {number} width - new width
 * @param {number} [height] - new height - default same as {@linkcode width}
 */
const setCanvasSize=(width,height)=>{
    height??=width;
    if(
        height!==html.canvas.height
        ||width!==html.canvas.width
    ){
        html.canvas.width=width;
        html.canvas.height=height;
        const arrRef=global.state.randomOrder;
        for(let i=(arrRef.length=html.canvas.width*html.canvas.height)-1;i>=0;--i)arrRef[i]=i;
        for(let i=arrRef.length-1;i>0;--i){
            const j=Math.trunc(Math.random()*(i+1));
            if(i!==j)[arrRef[i],arrRef[j]]=[arrRef[j],arrRef[i]];
        }
    }
    html.cnx.globalCompositeOperation="copy";
    html.cnx.imageSmoothingEnabled=false;
};
/**
 * ## Scales area to fit window size ({@linkcode global.state.winW}*{@linkcode global.state.winH}) and returns new width/height
 * @param {number} width - area width
 * @param {number} height - area height
 * @param {boolean} [inv] - if `true` scales window size to given area (keeping aspect ratio) - default `false`
 * @returns {[number,number]} new `[width,height]` of area
 */
const scaleToWindow=(width,height,inv)=>{
    if(inv??false){
        const scaledWidth=global.state.winW*(height/global.state.winH);
        if(scaledWidth<width)return[width,global.state.winH*(width/global.state.winW)];
        return[scaledWidth,height];
    }
    const scaledWidth=width*(global.state.winH/height);
    if(scaledWidth>global.state.winW!==(inv??false))return[global.state.winW,height*(global.state.winW/width)];
    return[scaledWidth,global.state.winH];
};
/**## Scales {@linkcode html.canvas} from current view area to fit current window size*/
const setCanvasSizeAuto=()=>setCanvasSize(...scaleToWindow(global.state.rmax-global.state.rmin,global.state.imax-global.state.imin));

//#region draw

/**
 * ## Get color for a value from an {@linkcode global.algo} calculation
 * @param {number} value - value [0-1] (can be out of bounds) - clip at +-`Infinity`
 * @returns {[number,number,number,number]|null} `[R,G,B,A]` in range [0-255] or `null` when clipped
 */
const getColor=value=>{
    if(!Number.isFinite(value))return null;
    const saturation=value*(global.state.cmax-global.state.cmin)+global.state.cmin;
    if(global.state.color==null)return[...hueToRGB(saturation),0xFF];
    let tmp=0;
    return[
        (tmp=(global.state.color[0]*saturation)%0x100)<0?0x100+tmp:tmp,
        (tmp=(global.state.color[1]*saturation)%0x100)<0?0x100+tmp:tmp,
        (tmp=(global.state.color[2]*saturation)%0x100)<0?0x100+tmp:tmp,
        0xFF
    ];
};

/**
 * ## Calculates the {@linkcode mandelbrot} set and draws it to {@linkcode html.cnx} ({@linkcode html.canvas}), updates {@linkcode html.loading}, and responds to {@linkcode global.render} signals
 * {@linkcode html.canvas.width} and {@linkcode html.canvas.height} should be modified to the same aspect ratio as {@linkcode global.state.rmin} ↔ {@linkcode global.state.rmax} and {@linkcode global.state.imin} ↕ {@linkcode global.state.imax} or the resulting image will be distorted\
 * _waits for a script-cycle each pixel, a full-cycle each row (after drawing), and can be stopped with {@linkcode global.render}_\
 * (inverts Y so it increases from bottom to top on screen)
 */
const draw=async()=>{
    global.render.start();
    html.loading.removeAttribute("value");
    html.loading.classList.remove("hide");
    await new Promise(E=>setTimeout(E,10));
    const
        fullPixels=html.canvas.width*html.canvas.height,
        partPixels=1/fullPixels;
    // TODO render order ~ top2bottom, left2right, bottom2top, right2left, outwards-vertical, outwards-horizontal, outwards-spiral (square), inwards-..., random (default) (see below)
    switch(global.order[global.state.order]){
        case"top2bottom":
            const pixelLine=new ImageData(html.canvas.width,1);
            outer:for(let pixelsDrawn=0,x=0,y=0;y<html.canvas.height;++y){
                for(x=0;x<html.canvas.width;++x){
                    const color=getColor(global.algo[global.state.algo](
                        map(x,0,html.canvas.width-1,global.state.rmin,global.state.rmax),
                        map(y,html.canvas.height-1,0,global.state.imin,global.state.imax),
                        global.state.limit
                    ));
                    if(color===null)pixelLine.data[x*4+3]=0;
                    else pixelLine.data.set(color,x*4);
                    html.loading.value=(y*html.canvas.width+x)*partPixels;
                    if(++pixelsDrawn>=global.state.pixelDelay){
                        pixelsDrawn=0;
                        html.cnx.putImageData(pixelLine,0,y);
                        await new Promise(E=>window.requestAnimationFrame(E));
                    }
                    if(await global.render.check())break outer;
                }
                html.cnx.putImageData(pixelLine,0,y);
            }
        break;
        case"random"://! fall through
        default:
            const img=new ImageData(html.canvas.width,html.canvas.height);
            for(let pixelsDrawn=0,pixel=0;pixel<fullPixels;++pixel){
                const
                    [y,x]=divQR(global.state.randomOrder[pixel],html.canvas.width),
                    color=getColor(global.algo[global.state.algo](
                        map(x,0,html.canvas.width-1,global.state.rmin,global.state.rmax),
                        map(y,html.canvas.height-1,0,global.state.imin,global.state.imax),
                        global.state.limit
                    ));
                if(color===null)img.data[(y*html.canvas.width+x)*4+3]=0;
                else img.data.set(color,(y*html.canvas.width+x)*4);
                html.loading.value=pixel*partPixels;
                if(++pixelsDrawn>=global.state.pixelDelay){
                    pixelsDrawn=0;
                    html.cnx.putImageData(img,0,0);
                    await new Promise(E=>window.requestAnimationFrame(E));
                }
                if(await global.render.check())break;
            }
            html.cnx.putImageData(img,0,0);
        break;
    }
    html.loading.classList.add("hide");
    global.render.end();
};
/**
 * ## Calls {@linkcode draw} with the values stored in {@linkcode global.state} with optional overrides
 * _does not change values in {@linkcode global.state}_
 * @param {number} [limit] - [optional] limit for the mandelbrot algorithm
 * @param {[([number,number,number]|null)?,number?,number?]} [colors] - [optional] `[color-change, color-start, color-end]` - color-change (from color-start to color-end) via hue = `null` or saturation = `[R,G,B]` (integer [0-255])
 * @param {number} [algo] - [optional] index into {@linkcode global.algo}
 * @param {number} [order] - [optional] index into {@linkcode global.order}
 * @param {boolean} [restore] - [optional] if `true` restores original values after {@linkcode draw} has finished - default `true`
 */
const redraw=async(limit,colors,algo,order,restore)=>{
    global.render.break();
    global.render.resume();
    for(;global.render.running;await new Promise(E=>setTimeout(E,0)));
    global.render.reset();
    clearTimeout(global.state.moveTimeout);
    /**@type {[number,([number,number,number]|null),number,number,number,number]}*/
    const store=[global.state.limit,global.state.color,global.state.cmin,global.state.cmax,global.state.algo,global.state.order];
    let change=false;
    if(limit!=null&&(change=global.state.limit!==limit))global.state.limit=limit;
    if(colors!=null&&(change=global.state.color!==colors[0]||global.state.cmin!==colors[1]||global.state.cmax!==colors[2]))[
        global.state.color=colors[0]===null?null:global.state.color,
        global.state.cmin=global.state.cmin,
        global.state.cmax=global.state.cmax
    ]=colors;
    if(algo!=null&&(change=global.state.algo!==algo))global.state.algo=algo;
    if(order!=null&&(change=global.state.order!==order))global.state.order=order;
    await draw();
    if((restore??true)&&change)[global.state.limit,global.state.color,global.state.cmin,global.state.cmax,global.state.algo,global.state.order]=store;
};
/**## Scaes the {@linkcode html.canvas} to window size and {@linkcode redraw}*/
const full=async()=>{
    if(html.canvas.width<global.state.winW){
        const dif=(rw=>(rw*global.state.winW*(html.canvas.width**-1)-rw)*(global.state.rmin<global.state.rmax?.5:-.5))(Math.abs(global.state.rmin-global.state.rmax));
        global.state.rmin-=dif;
        global.state.rmax+=dif;
        setCanvasSize(global.state.winW,global.state.winH);
    }else if(html.canvas.height<global.state.winH){
        const dif=(ih=>(ih*global.state.winH*(html.canvas.height**-1)-ih)*(global.state.imin<global.state.imax?.5:-.5))(Math.abs(global.state.imin-global.state.imax));
        global.state.imin-=dif;
        global.state.imax+=dif;
        setCanvasSize(global.state.winW,global.state.winH);
    }else return;
    await redraw();
};

//#region zoom & move

/**
 * ## Zoom in on a selected area in the mandelbrot set or on screen (set {@linkcode pixels} to `true`)
 * _does nothing if the size of the area is 0_
 * @param {number} left - start of the area on the real axis
 * @param {number} top - start of the area on the imaginary axis
 * @param {number} right - end of the area on the real axis
 * @param {number} bottom - end of the area on the imaginary axis
 * @param {boolean} [pixels] - if `true` treads values as screen-space pixel coordinates depending on {@linkcode html.canvas}, {@linkcode global.state.zoom}, and {@linkcode global.state.panX}/{@linkcode global.state.panY}
 */
const zoomArea=async(left,top,right,bottom,pixels)=>{
    if(left-right===0||top-bottom===0)return;
    global.render.break();
    global.render.resume();
    for(;global.render.running;await new Promise(E=>setTimeout(E,0)));
    global.render.reset();
    if(pixels??false){
        const
            [cl,cr]=((wwp,cw)=>[wwp-cw,wwp+cw])(global.state.winW*.5+global.state.panX,html.canvas.width*global.state.zoom*.5),
            [ct,cb]=((whp,ch)=>[whp-ch,whp+ch])(global.state.winH*.5+global.state.panY,html.canvas.height*global.state.zoom*.5),
            rmin=map(left,cl,cr,global.state.rmin,global.state.rmax),
            rmax=map(right,cl,cr,global.state.rmin,global.state.rmax),
            imin=map(global.state.winH-bottom,ct,cb,global.state.imin,global.state.imax),
            imax=map(global.state.winH-top,ct,cb,global.state.imin,global.state.imax);
        global.state.rmin=rmin;
        global.state.rmax=rmax;
        global.state.imin=imin;
        global.state.imax=imax;
    }else{
        global.state.rmin=left;
        global.state.rmax=right;
        global.state.imin=top;
        global.state.imax=bottom;
    }
    setCanvasSizeAuto();
    await redraw();
};
/**
 * ## Zooms in/out uniformly by {@linkcode percent} and {@linkcode redraw}
 * @param {number} percent - percent of current view ({@linkcode global.state.rmin} ↔ {@linkcode global.state.rmax} and {@linkcode global.state.imin} ↕ {@linkcode global.state.imax})
 * - zoom in: 1 < # < `Infinity`
 * - zoom out: 0 < # < 1
 * - 1 does nothing
 * - negative numbers invert the view horizontaly and verticaly
 * @throws {RangeError} if {@linkcode percent} is 0
 */
const zoom=async percent=>{
    if(percent===1)return;
    if(percent===0)throw new RangeError("[zoom] percent must not be 0");
    const
        scaler=(1-percent**-1)*.5,
        dw=Math.abs(global.state.rmin-global.state.rmax)*scaler,
        dh=Math.abs(global.state.imin-global.state.imax)*scaler;
    global.state.rmin+=dw;
    global.state.rmax-=dw;
    global.state.imin+=dh;
    global.state.imax-=dh;
    await redraw();
};
/**
 * ## Move in a direction with current view
 * @param {number} amount - amout of pixels to move to the right (-) or left (+)
 * @param {boolean} vertical - if `true` use {@linkcode amount} to go down (-) or up (+)
 */
const move=async(amount,vertical)=>{
    global.render.break();
    global.render.resume();
    for(;global.render.running;await new Promise(E=>setTimeout(E,0)));
    global.render.reset();
    if(vertical){
        const amountImag=Math.abs(global.state.imin-global.state.imax)*(-amount/html.canvas.height);
        global.state.imin-=amountImag;
        global.state.imax-=amountImag;
    }else{
        const amountReal=Math.abs(global.state.rmin-global.state.rmax)*(-amount/html.canvas.width);
        global.state.rmin+=amountReal;
        global.state.rmax+=amountReal;
    }
    if(global.order[global.state.order]==="random")return redraw();
    //~ move canvas and draw missing pixels
    const reverse=amount<0,
        amountAbs=reverse?-amount:amount;
    global.render.start();
    if(vertical){
        html.cnx.drawImage(
            html.canvas,
            0,reverse?amountAbs:0,html.canvas.width,html.canvas.height-amountAbs,
            0,reverse?0:amountAbs,html.canvas.width,html.canvas.height-amountAbs
        );
        const pixelLine=new ImageData(html.canvas.width,1);
        outer:for(let pixelsDrawn=0,x=0,y=reverse?html.canvas.height+amount:0;reverse?y<html.canvas.height:y<amount;++y){
            for(x=0;x<html.canvas.width;++x){
                const color=getColor(global.algo[global.state.algo](
                    map(x,0,html.canvas.width-1,global.state.rmin,global.state.rmax),
                    map(y,html.canvas.height-1,0,global.state.imin,global.state.imax),
                    global.state.limit
                ));
                if(color==null)pixelLine.data[x*4+3]=0;
                else pixelLine.data.set(color,x*4);
                if(++pixelsDrawn>=global.state.pixelDelay){
                    pixelsDrawn=0;
                    await new Promise(E=>window.requestAnimationFrame(E));
                }
                if(await global.render.check())break outer;
            }
            html.cnx.putImageData(pixelLine,0,y);
        }
    }else{
        html.cnx.drawImage(
            html.canvas,
            reverse?amountAbs:0,0,html.canvas.width-amountAbs,html.canvas.height,
            reverse?0:amountAbs,0,html.canvas.width-amountAbs,html.canvas.height
        );
        const pixelLine=new ImageData(1,html.canvas.height);
        outer:for(let pixelDelay=0,x=reverse?html.canvas.width+amount:0,y=0;reverse?x<html.canvas.width:x<amount;++x){
            for(y=0;y<html.canvas.height;++y){
                const color=getColor(global.algo[global.state.algo](
                    map(x,0,html.canvas.width-1,global.state.rmin,global.state.rmax),
                    map(y,html.canvas.height-1,0,global.state.imin,global.state.imax),
                    global.state.limit
                ));
                if(color==null)pixelLine.data[y*4+3]=0;
                else pixelLine.data.set(color,y*4);
                if(++pixelDelay>=global.state.pixelDelay){
                    pixelDelay=0;
                    await new Promise(E=>window.requestAnimationFrame(E));
                }
                if(await global.render.check())break outer;
            }
            html.cnx.putImageData(pixelLine,x,0);
        }
    }
    global.render.end();
    clearTimeout(global.state.moveTimeout);
    global.state.moveTimeout=setTimeout(()=>redraw(),0x3E8);
}

//#region read/write view

/**## Get the current Mandelbrot view as string*/
const getView=()=>`${global.state.algo}:${global.state.limit},${JSON.stringify(global.state.color)},${global.state.cmin},${global.state.cmax}:${global.state.rmin},${global.state.rmax},${global.state.imin},${global.state.imax}`;
/**## Copy {@linkcode getView} to clipboard (_document must be focused and in secure context ie. HTTPS / localhost_)*/
const copyView=()=>navigator.clipboard.writeText(getView()).catch(reason=>console.warn("[getView] Couldn't write text to clipboard; reason: %O",reason));
/**## Download {@linkcode getView} to a TXT file*/
const downloadView=()=>Object.assign(document.createElement("a"),{href:`data:,${encodeURIComponent(getView())}`,download:"Mandelbrot.txt"}).click();
/**## Regex for {@linkcode setView} (matches {@linkcode getView} with optional whitespace)*/
const parseViewRegex=(jsNum=>new RegExp(`^(${jsNum})? ?: ?(${jsNum})? ?, ?(null|\\[ ?${jsNum} ?, ?${jsNum} ?, ?${jsNum} ?\\])? ?, ?(${jsNum})? ?, ?(${jsNum})? ?: ?(${jsNum})? ?, ?(${jsNum})? ?, ?(${jsNum})? ?, ?(${jsNum})?$`))("[+-]?(?:0[bB][01](?:_?[01]+)*|0[oO][0-7](?:_?[0-7]+)*|0[xX][0-9a-fA-F](?:_?[0-9a-fA-F]+)*|(?:[0-9](?:_?[0-9]+)*(?:\\.(?:[0-9](?:_?[0-9]+)*)?)?|\\.[0-9](?:_?[0-9]+)*)(?:[eE][+-]?[0-9](?:_?[0-9]+)*)?)");
/**
 * ## Parse a string from {@linkcode getview} via {@linkcode parseViewRegex}, set {@linkcode html.canvas} size, and {@linkcode redraw} ({@linkcode zoomArea})
 * @param {string} str - a string in format: `algo : limit , color , cmin , cmax , algo : rmin , rmax , imin , imax` - all parameters and whitespace are optional
 */
const setView=async str=>{
    const m=str.trim().match(parseViewRegex);
    if(m==null)return;
    global.state.algo=m[1]==null?0:Math.min(Math.max(Math.trunc(Number(m[1])),0),Number.MAX_SAFE_INTEGER);
    global.state.limit=m[2]==null?global.defaults[global.state.algo].limit:Number(m[2]);
    global.state.color=m[3]==null?global.defaults[global.state.algo].color:m[3]==="null"?null:JSON.parse(m[3]).map(v=>Math.trunc(v));
    global.state.cmin=m[4]==null?global.defaults[global.state.algo].cmin:Number(m[4]);
    global.state.cmax=m[5]==null?global.defaults[global.state.algo].cmax:Number(m[5]);
    await zoomArea(
        m[6]==null?global.defaults[global.state.algo].rmin:Number(m[6]),
        m[8]==null?global.defaults[global.state.algo].imin:Number(m[8]),
        m[7]==null?global.defaults[global.state.algo].rmax:Number(m[7]),
        m[9]==null?global.defaults[global.state.algo].imax:Number(m[9])
    );
};

/**
 * ## Copy current {@linkcode html.canvas} content as PNG to clipboard (_document must be focused and in secure context ie. HTTPS / localhost_)
 * @param {number} [scaledWidth] - [optional] scale {@linkcode html.canvas} to given width before copying image and reset afterwards otherwise use current resolution
 */
const copyImage=async scaledWidth=>{
    if(scaledWidth==null)return html.canvas.toBlob(img=>img==null||navigator.clipboard.write([new ClipboardItem({"image/png":img})]),"image/png");
    const
        cw=html.canvas.width,
        ch=html.canvas.height;
    setCanvasSize(scaledWidth,scaledWidth*ch*cw**-1);
    await redraw();
    const img=await new Promise(E=>html.canvas.toBlob(E,"image/png"));
    if(img!=null)await navigator.clipboard.write([new ClipboardItem({"image/png":img})]);
    setCanvasSize(cw,ch);
    await redraw();
}
/**
 * ## Download current {@linkcode html.canvas} content to a PNG file
 * @param {number} [scaledWidth] - [optional] scale {@linkcode html.canvas} to given width before downloading image and reset afterwards otherwise use current resolution
 */
const downloadImage=async scaledWidth=>{
    if(scaledWidth==null)return Object.assign(document.createElement("a"),{href:html.canvas.toDataURL("image/png"),download:"Mandelbrot.png"}).click();
    const
        cw=html.canvas.width,
        ch=html.canvas.height;
    setCanvasSize(scaledWidth,scaledWidth*ch*cw**-1);
    await redraw();
    Object.assign(document.createElement("a"),{href:html.canvas.toDataURL("image/png"),download:"Mandelbrot.png"}).click();
    //? wait for download to finish
    await new Promise(E=>setTimeout(E,1000));
    setCanvasSize(cw,ch);
    await redraw();
}

//#region cursor

//~ cursor canvas
window.requestAnimationFrame(function cursor(){
    //~ no coordinates if the mouse has not moved yet
    if(Number.isNaN(global.mouse.moveTimeout)){window.requestAnimationFrame(cursor);return;}
    html.cursor.width=global.state.winW;
    html.cursor.height=global.state.winH;
    html.crx.imageSmoothingEnabled=false;
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
    let sx=Math.min(global.mouse.dragX,global.mouse.area?global.mouse.upX:global.mouse.x),
        sy=Math.min(global.mouse.dragY,global.mouse.area?global.mouse.upY:global.mouse.y),
        sw=Math.abs(global.mouse.dragX-(global.mouse.area?global.mouse.upX:global.mouse.x)),
        sh=Math.abs(global.mouse.dragY-(global.mouse.area?global.mouse.upY:global.mouse.y));
    if(global.mouse.hold||global.mouse.area){
        html.crx.fillStyle="#F90A";
        html.crx.fillRect(sx,sy,sw,sh);
        html.crx.lineWidth=1;
        html.crx.strokeStyle="#444";
        const[aw,ah]=scaleToWindow(sw,sh,true);
        html.crx.strokeRect(sx+(sw-aw)*.5,sy+(sh-ah)*.5,aw,ah);
    }
    //~ coordinates
    // TODO (move) XY,complex | (hold/up) XY,WH |~ formatComplex()

    window.requestAnimationFrame(cursor);
});

//#region context/settings menu

// TODO copy self complex number ~ formatComplex()
// .addEventListener("click",ev=>navigator.clipboard.writeText(ev.target.value).catch(reason=>console.warn("[] Couldn't write text to clipboard; reason: %O",reason))},{passive:true});

//#region event listeners

window.addEventListener("mousemove",ev=>{
    global.mouse.x=ev.clientX*window.devicePixelRatio;
    global.mouse.y=ev.clientY*window.devicePixelRatio;
    global.mouse.move=true;
    clearTimeout(global.mouse.moveTimeout);
    global.mouse.moveTimeout=setTimeout(()=>global.mouse.move=false,3000);
},{passive:true});
window.addEventListener("mousedown",ev=>{
    //~ 0 left ; 1 middle ; 2 right
    if(ev.button===1)window.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter"}));
    if(ev.button!==0)return;
    // TODO ignore (target) settings or context menu
    global.mouse.area=false;
    global.mouse.hold=true;
    global.mouse.dragX=ev.clientX*window.devicePixelRatio;
    global.mouse.dragY=ev.clientY*window.devicePixelRatio;
},{passive:true});
window.addEventListener("mouseup",ev=>{
    if(!global.mouse.hold)return;
    global.mouse.hold=false;
    global.mouse.upX=ev.clientX*window.devicePixelRatio;
    global.mouse.upY=ev.clientY*window.devicePixelRatio;
    global.mouse.area=ev.button===0&&(global.mouse.dragX-global.mouse.upX!==0&&global.mouse.dragY-global.mouse.upY!==0);
},{passive:true});

window.addEventListener("keydown",ev=>{
    // console.log(ev.key);
    // TODO key "ContextMenu" also show/hide the context menu (and shift focus)
    // TODO don't prevent default in settings or context menu (all keys)
    switch(ev.key){
        case"Enter":
            if(global.mouse.area){
                global.mouse.area=false;
                const
                    [ml,mr]=global.mouse.dragX<global.mouse.upX?[global.mouse.dragX,global.mouse.upX]:[global.mouse.upX,global.mouse.dragX],
                    [mt,mb]=global.mouse.dragY<global.mouse.upY?[global.mouse.dragY,global.mouse.upY]:[global.mouse.upY,global.mouse.dragY];
                zoomArea(ml,mt,mr,mb,true);
            }else redraw();
        break;
        case"PageUp":
            ev.preventDefault();
            if(ev.shiftKey){if(++global.state.order>=global.order.length)global.state.order=0;}
            else if(++global.state.algo>=global.algo.length)global.state.algo=0;
            redraw();
        break;
        case"PageDown":
            ev.preventDefault();
            if(ev.shiftKey){if(--global.state.order<0)global.state.order=global.order.length-1;}
            else if(--global.state.algo<0)global.state.algo=global.algo.length-1;
            redraw();
        break;
        case"Pause":
            ev.preventDefault();
            global.render.toggle();
            // TODO toggle (HTML) pause button
        break;
        case"End":
        case"Cancel":
            ev.preventDefault();
            clearTimeout(global.state.moveTimeout);
            global.render.break();
            global.render.resume();
            (async()=>{
                for(;global.render.running;await new Promise(E=>setTimeout(E,0)));
                global.render.reset();
            })();
        break;
        case"Home":
            ev.preventDefault();
            if(ev.ctrlKey)Object.assign(global.state,global.defaults[global.state.algo]);
            else{
                const{rmin,rmax,imin,imax}=global.defaults[global.state.algo];
                global.state.rmin=rmin;
                global.state.rmax=rmax;
                global.state.imin=imin;
                global.state.imax=imax;
            }
            setCanvasSizeAuto();
            redraw();
            if(!ev.shiftKey)break;
            //! fall through
        case"r":
            ev.preventDefault();
            html.canvas.style.setProperty("--zoom",String(global.state.zoom=1));
            html.canvas.style.setProperty("--panX",String(global.state.panX=0));
            html.canvas.style.setProperty("--panY",String(global.state.panY=0));
        break;
        case"f":ev.preventDefault();full();break;
        case"c":ev.preventDefault();copyView();break;
        case"s":ev.preventDefault();copyImage();break;
        case"C":ev.preventDefault();downloadView();break;
        case"S":ev.preventDefault();downloadImage();break;
        case"0":
            if(ev.ctrlKey)break;
            ev.preventDefault();
            global.state.limit=10;
            redraw();
        break;
        case"1":ev.preventDefault();global.state.limit=20;redraw();break;
        case"2":ev.preventDefault();global.state.limit=50;redraw();break;
        case"3":ev.preventDefault();global.state.limit=100;redraw();break;
        case"4":ev.preventDefault();global.state.limit=200;redraw();break;
        case"5":ev.preventDefault();global.state.limit=500;redraw();break;
        case"6":ev.preventDefault();global.state.limit=1000;redraw();break;
        case"7":ev.preventDefault();global.state.limit=2000;redraw();break;
        case"8":ev.preventDefault();global.state.limit=5000;redraw();break;
        case"9":ev.preventDefault();global.state.limit=10000;redraw();break;
        case"+":
            if(ev.ctrlKey)break;
            ev.preventDefault();
            zoom(ev.altKey?1.1:1.5);
        break;
        case"-":
            if(ev.ctrlKey)break;
            ev.preventDefault();
            zoom(ev.altKey?10/11:2/3);
        break;
        case"ArrowUp":ev.preventDefault();move((ws=>ev.shiftKey?ws*.25:ev.ctrlKey?ws*.1:ev.altKey?1:ws*.01)(Math.min(global.state.winW,global.state.winH)),true);break;
        case"ArrowLeft":ev.preventDefault();move((ws=>ev.shiftKey?ws*.25:ev.ctrlKey?ws*.1:ev.altKey?1:ws*.01)(Math.min(global.state.winW,global.state.winH)),false);break;
        case"ArrowDown":ev.preventDefault();move(-(ws=>ev.shiftKey?ws*.25:ev.ctrlKey?ws*.1:ev.altKey?1:ws*.01)(Math.min(global.state.winW,global.state.winH)),true);break;
        case"ArrowRight":ev.preventDefault();move(-(ws=>ev.shiftKey?ws*.25:ev.ctrlKey?ws*.1:ev.altKey?1:ws*.01)(Math.min(global.state.winW,global.state.winH)),false);break;
    }
},{passive:false});

// TODO paste view (text field)
// .addEventListener("paste",ev=>{
//     ev.preventDefault();
//     setView(ev.clipboardData?.getData("text")??"");
// },{passive:false});

window.addEventListener("resize",()=>{
    global.render.pause();
    html.loading.removeAttribute("value");
    html.canvas.style.setProperty("--dpr",String(window.devicePixelRatio));
    clearTimeout(global.state.resizeTimeout);
    global.state.resizeTimeout=setTimeout(async()=>{
        global.state.winW=Math.trunc(window.innerWidth*window.devicePixelRatio);
        global.state.winH=Math.trunc(window.innerHeight*window.devicePixelRatio);
        const[newWidth,newHeight]=scaleToWindow(html.canvas.width,html.canvas.height);
        if(html.canvas.width!==newWidth||html.canvas.height!==newHeight){
            global.render.break();
            global.render.resume();
            for(;global.render.running;await new Promise(E=>setTimeout(E,0)));
            global.render.reset();
            setCanvasSize(newWidth,newHeight);
            redraw();
        }else global.render.resume();
    },1000);
},{passive:true});

//#region init

// TODO ~ override defaults from browser history or session storage (in that order)
setCanvasSizeAuto();
window.dispatchEvent(new UIEvent("resize"));
redraw();

// TODO (format) log short description and functions to dev-console

//#region todos

// TODO context-menu: see HTML / resolution>custom(edited in settings),1%,5%,10%,1/4,1/3,1/2,2/3,3/4,1:1,150%,200%
// TODO > settings-dialog: pos (recalc new areas) / scale (recalc) / hue start,end (draw preview)
// TODO ! save mandelbrot values in Float32Array (min 1.4e-45 then 0, max 3.402823e38 then Infinity) for faster rerendering when changing color ?
// TODO > (x+yi) when calculating -y and a +y exists use that and skip calculation ~ same for +y → -y (mirrored along real axis) in mandelbrot
// TODO option to lower render resolution % or px ~ set in resize
// TODO ! use webworkers (for each row ? also for moving with keyboard !) ~ multithreading :: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#dedicated_workers
// TODO ? shared array buffer ~ populate set number of pixels not cols/rows ~ x0y0→x300y2 by 350*350 (max 1k pixels each)
// TODO > settings to en-/disable webworkers | max webworkers
// TODO mouse crosshair ~ draw box and click inside = zoom to that area ~ zoom out ? history of zoom steps [rectangle:posXY,minXY,maxXY] ~ undo/redo stack (also set browser history)
// TODO pan & zoom (only visual zoom no calculation) controls like in GIF-decoder
// TODO visual feedback when changing algorithm via keyboard

// TODO zoom animation ~
// > 0:200,null,-1.3,1.99:-0.7479202944425645,-0.7479202944425407,-0.10792434653846888,-0.10792434653844807
// > 0:2000,null,-1.3,1.99:-0.7325826375853152,-0.7325826375853023,0.2411471363788535,0.24114713637886623
// > 0:10000,null,-1.3,1.99:-0.7436438870371698,-0.7436438870371482,-0.13182590420532267,-0.13182590420530219
// (ffmpeg zoom default) > ((x,y)=>((global.state.limit=10000),zoomArea(x-Number.EPSILON,y-Number.EPSILON,x+Number.EPSILON,y+Number.EPSILON,false)))(-0.743643887037158704752191506114774,-0.131825904205311970493132056385139)
// TODO test if only mouse or keyboard is possible (touch?)
