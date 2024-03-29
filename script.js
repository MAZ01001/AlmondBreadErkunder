//@ts-check
"use strict";

/**
 * ## Calculates the iteration count for the given position in the mandelbrot set
 * @param {number} real - position on the real axis
 * @param {number} imag - position on the complex axis
 * @param {number} maxI - max iteration count (integer >= 1)
 * @param {0|1|2} [variance] - `0` normal / `1` spiky / `2` tubes - defaults to normal
 * @returns {number} iteration count [1-{@linkcode maxI}] (assume clipping when the result is exactly {@linkcode maxI})
 */
const mandelbrot=(real,imag,maxI,variance)=>{
    "use strict";
    let i=1;
    switch(variance){
        case 1:for(let cr=real,ci=imag;i<maxI&&cr*ci<3;i++)[cr,ci]=[(cr*cr-ci*ci)+real,2*cr*ci+imag];break;
        case 2:for(let cr=real,ci=imag;i<maxI&&cr+ci>-3;i++)[cr,ci]=[(cr*cr-ci*ci)+real,2*cr*ci+imag];break;
        default:for(let cr=real,ci=imag;i<maxI&&cr*cr+ci*ci<8;i++)[cr,ci]=[(cr*cr-ci*ci)+real,2*cr*ci+imag];break;
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
}
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
/**
 * ## Calculates the {@linkcode mandelbrot} set and returns a generator for rendering the given rectangle ({@linkcode width}*{@linkcode height})
 * {@linkcode width} to {@linkcode height} and {@linkcode imin} ↔ {@linkcode imax} to {@linkcode imin} ↔ {@linkcode imax} should have the same aspect ratio or the resulting image will be distorted
 * @param {number} width - width of the image
 * @param {number} height - height of the image
 * @param {number} limit - limit for the mandelbrot algorithm
 * @param {number} rmin - start value of real part in mandelbrot set
 * @param {number} rmax - end value of real part in mandelbrot set
 * @param {number} imin - start value of imaginary part in mandelbrot set
 * @param {number} imax - end value of imaginary part in mandelbrot set
 * @param {number} [hueMin] - hue range minimum (float) - default `0`
 * @param {number} [hueMax] - hue range maximum (float) - default `1`
 * @returns {Generator<[ImageData|null,number],void,unknown>} `[NULL, progress]` for each pixel and `[img strip, Y offset]` for each row of the given rectangle ({@linkcode width}*{@linkcode height})
 */
const imageStrips=function*(width,height,limit,rmin,rmax,imin,imax,hueMin,hueMax){
    "use strict";
    const pixelLine=new ImageData(width,1),
        invPixels=1/(width*height),
        /**@type {[number,number]}*/
        hue=[hueMin??0,hueMax??1];
    for(let x=0,y=0;y<height;y++){
        for(x=0;x<width;x++){
            const value=mandelbrot(map(x,0,width-1,rmin,rmax),map(y,0,height-1,imin,imax),limit);
            if(value<limit)pixelLine.data.set([...hueToRGB(map(value,1,limit,...hue)),0xFF],x*4);
            else pixelLine.data[x*4+3]=0;
            yield[null,(y*width+x)*invPixels];
        }
        yield[pixelLine,y];
    }
};

const html=Object.freeze({
    /**@type {HTMLCanvasElement}*///@ts-ignore element does exist in DOM
    canvas:document.getElementById("canvas"),
    /**@type {HTMLProgressElement}*///@ts-ignore element does exist in DOM
    loading:document.getElementById("loading"),
    /**@type {CanvasRenderingContext2D}*///@ts-ignore element does exist in DOM & gets checked for NULL later on
    cnx:document.getElementById("canvas").getContext("2d")
})
if(html.cnx==null)throw"couldn't get canvas 2d context";

const global=Object.freeze({
    mouse:new class{
        // TODO ~ move variables to global.var and event listeners outside
        /**@type {number} current Mouse X position */
        #x=0;get x(){return this.#x;}
        /**@type {number} current Mouse Y position */
        #y=0;get y(){return this.#y;}
        /**@type {boolean} `true` when a mouse button is held down (see {@linkcode hold} on which element it started)*/
        #hold=false;get hold(){return this.#hold;}
        /**@type {EventTarget|null}*/
        #drag=null;get drag(){return this.#drag;}
        /**@type {NaN|0|1|2} `NaN` none / 0 left / 1 middle / 2 right*/
        #button=NaN;get button(){return this.#button;}
        constructor(){
            "use strict";
            window.addEventListener("mousemove",ev=>{
                "use strict";
                this.#x=ev.clientX;
                this.#y=ev.clientY;
            },{passive:true});
            window.addEventListener("mousedown",ev=>{
                "use strict";
                this.#button=ev.button;
                this.#hold=true;
                this.#drag=ev.target;
            },{passive:true});
            window.addEventListener("mouseup",ev=>{
                "use strict";
                this.#button=NaN;
                this.#hold=false;
                this.#drag=null;
            },{passive:true});
        }
    }(),
    render:new class{
        #pause=false;
        #break=false;
        #running=false;
        get running(){return this.#running;}
        pause(){this.#pause=true;}
        resume(){this.#pause=false;}
        break(){this.#break=true;}
        reset(){this.#break=(this.#pause=false);}
        start(){this.#running=true;}
        end(){this.#running=false;}
        async check(){
            "use strict";
            for(;this.#pause;await new Promise(E=>setTimeout(E,100)));
            return this.#break;
        }
    },
    view:Object.seal({
        width:10,
        height:10,
        limit:40,
        rmin:-2,
        rmax:.6,
        imin:-1.3,
        imax:1.3,
        hueMin:-1.4,
        hueMax:-.8,
        // TODO ~ move to global.var
        [Symbol.iterator]:function*(){
            yield global.view.width;
            yield global.view.height;
            yield global.view.limit;
            yield global.view.rmin;
            yield global.view.rmax;
            yield global.view.imin;
            yield global.view.imax;
            yield global.view.hueMin;
            yield global.view.hueMax;
        }
    }),
    var:Object.seal({
        resizeTimeout:NaN,
        scale:1
    })
});

/**
 * ## Draws the given rectangle ({@linkcode width}*{@linkcode height}) to {@linkcode html.cnx} ({@linkcode html.canvas}), updates {@linkcode html.loading}, and responds to {@linkcode global.render} signals
 * _waits for a script-cycle each pixel and a full-cycle each row (after drawing)_
 * @param {number} width - width of the image
 * @param {number} height - height of the image
 * @param {number} limit - limit for the mandelbrot algorithm
 * @param {number} rmin - start value of real part in mandelbrot set
 * @param {number} rmax - end value of real part in mandelbrot set
 * @param {number} imin - start value of imaginary part in mandelbrot set
 * @param {number} imax - end value of imaginary part in mandelbrot set
 * @param {number} [hueMin] - hue range minimum (float) - default `0`
 * @param {number} [hueMax] - hue range maximum (float) - default `1`
 */
const draw=async(width,height,limit,rmin,rmax,imin,imax,hueMin,hueMax)=>{
    "use strict";
    global.render.start();
    html.loading.removeAttribute("value");
    html.loading.classList.remove("hide");
    await new Promise(E=>setTimeout(E,0));
    for(const[imgStrip,yOffset]of imageStrips(width,height,limit,rmin,rmax,imin,imax,hueMin,hueMax)){
        if(imgStrip==null){
            html.loading.value=yOffset;
            await Promise.resolve();
            if(await global.render.check())break;
            continue;
        }
        html.cnx.putImageData(imgStrip,0,yOffset);
        await new Promise(E=>setTimeout(E,0));
        if(await global.render.check())break;
    }
    html.loading.classList.add("hide");
    global.render.end();
};

window.addEventListener("resize",()=>{
    "use strict";
    global.render.pause();
    html.loading.removeAttribute("value");
    clearTimeout(global.var.resizeTimeout);
    global.var.resizeTimeout=setTimeout(async()=>{
        "use strict";
        const size=Math.trunc(Math.min(window.innerWidth,window.innerHeight)*global.var.scale*window.devicePixelRatio);
        if(size!==html.canvas.width){
            global.render.break();
            global.render.resume();
            for(;global.render.running;await new Promise(E=>setTimeout(E,0)));
            global.render.reset();
            global.view.width=global.view.height=//TODO
            html.canvas.width=html.canvas.height=size;
            //@ts-ignore global.view iterator has same number of elements as draw has parameters and in the same order
            draw(...global.view);
        }else global.render.resume();
    },500);
},{passive:true});


global.render.reset();
global.view.width=global.view.height=//TODO
html.canvas.width=html.canvas.height=Math.trunc(Math.min(window.innerWidth,window.innerHeight)*global.var.scale*window.devicePixelRatio);
//@ts-ignore global.view iterator has same number of elements as draw has parameters and in the same order
draw(...global.view);

// TODO context-menu: redraw / reset zoom / settings>dialog / css-checker>white,light,dark,black,off / mandelbrot-type>smooth(default),spiky,noodles (recalc) / css-smooth>off(default),low,medium,high / resolution>custom(edited in settings),1%,5%,10%,1/4,1/3,1/2,2/3,3/4,1:1,150%,200% / link to GitHub repo
// TODO > settings-dialog: pos (recalc new areas) / scale (recalc) / hue start,end (draw preview)
// TODO save mandelbrot values in typed f32array for faster rerendering when chaning hue ?
// TODO mouse crosshair ~ draw box and click inside = zoom to that area ~ zoom out ?
// TODO pan controls like in GIF-decoder
// TODO ! only draw new pixels when moving view around or resize larger window axis ~ 500ms like window-resize
// TODO draw full screen ? base is still square (no redraw when resize larger window axis)
