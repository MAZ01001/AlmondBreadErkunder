# Almond bread erkunder

A simple Mandelbrot explorer, calculated in native JavaScript and rendered to HTML5 canvas.

Link → <https://maz01001.github.io/AlmondBreadErkunder/> (path is case sensitive)

> [!IMPORTANT]
>
> Very much Work-In-Progress
>
> Things may change!

## Controls

| key                | action                                              |
| ------------------ | --------------------------------------------------- |
| left-drag          | select area                                         |
| enter/middle-click | render selected area or current view                |
| pause              | toggle pause/resume current render                  |
| end/cancel         | cancel the current render                           |
| home/pos1          | reset zoom and position of the current view         |
| F                  | expand view to window size                          |
| S                  | copy image as PNG to clipboard                      |
| shift+S            | download image as PNG file                          |
| C                  | copy position as text to clipboard                  |
| shift+C            | download position as text as TXT file               |
| page-up/down       | change mandelbrot style (smooth/spiky/noodles)      |
| shift+page-up/down | change render style (random/top2bottom)             |
| +/-                | zoom in/out (less with alt)                         |
| ↑←↓→               | move view (alt: slow, ctrl: fast, shift: very fast) |
| 0 to 9             | change limit: 10, 20, 50, 100, 200 (default), etc.  |

## Examples

<https://maz01001.github.io/AlmondBreadErkunder/#0:200,null,-1.3,1.99:-0.7479202944425645,-0.7479202944425407,-0.10792434653846888,-0.10792434653844807>

<https://maz01001.github.io/AlmondBreadErkunder/#0:2000,null,-1.3,1.99:-0.7325826375853152,-0.7325826375853023,0.2411471363788535,0.24114713637886623>

<https://maz01001.github.io/AlmondBreadErkunder/#0:10000,null,-1.3,1.99:-0.7436438870371698,-0.7436438870371482,-0.13182590420532267,-0.13182590420530219>
