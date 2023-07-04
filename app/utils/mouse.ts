//import { window.CANVAS_SCALE } from 'app/constants';
import { mainCanvas } from 'app/utils/canvas';
import { KEY, isKeyboardKeyDown } from 'app/utils/userInput';

let mousePosition: Coords = [-1000, -1000];
let mouseIsDown: boolean = false;
let rightMouseIsDown: boolean = false;
let middleMouseIsDown: boolean = false;

export function isMouseDown(): boolean {
    return mouseIsDown;
}

export function getMousePosition(container: HTMLElement|null = null, scale = 1): Coords {
    if (container) {
        const containerRect:DOMRect = container.getBoundingClientRect();
        return [
            (mousePosition[0] - containerRect.x) / scale,
            (mousePosition[1] - containerRect.y) / scale,
        ];
    }
    return [mousePosition[0] / scale, mousePosition[1] / scale];
}

function onMouseMove(event: MouseEvent) {
    mousePosition = [event.pageX, event.pageY];
    // console.log(mousePosition);
}
function onMouseDown(event: MouseEvent) {
    if (event.which === 1) mouseIsDown = true;
    if (event.which === 2) middleMouseIsDown = true;
    if (event.which === 3) rightMouseIsDown = true;
}
function onMouseUp(event: MouseEvent) {
    if (event.which === 1) mouseIsDown = false;
    if (event.which === 2) middleMouseIsDown = false;
    if (event.which === 3) rightMouseIsDown = false;
}

export function bindMouseListeners() {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
}
/* This would in theory be used if we ever cleaned up the application
export function unbindMouseListeners() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mouseup', onMouseUp);
    // Prevent mouse from being "stuck down"
    mouseIsDown = false;
}*/


export function isMouseOverElement(element: HTMLElement): boolean {
    const rect:DOMRect = element.getBoundingClientRect();
    return mousePosition[0] >= rect.x && mousePosition[0] <= rect.x + rect.width
        && mousePosition[1] >= rect.y && mousePosition[1] <= rect.y + rect.height;
}


export function isMiddleMouseDown(): boolean {
    return middleMouseIsDown;
}

export function isRightMouseDown(): boolean {
    return rightMouseIsDown;
}

export function addContextMenuListeners(): void {
    // Prevent the context menu from displaying when clicking over the canvas unless shift is held.
    mainCanvas.addEventListener('contextmenu', function (event) {
        if (isKeyboardKeyDown(KEY.SHIFT)) {
            return;
        }
        event.preventDefault();
        // const [x, y] = getMousePosition();
        // lastContextClick = getMousePosition(mainCanvas, window.CANVAS_SCALE);
    });
}
