
export function fillCircle(context: CanvasRenderingContext2D, circle: Circle, color?: string, strokeColor?: string) {
    context.beginPath();
    context.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
    if (color) {
        context.fillStyle = color;
        context.fill();
    }
    if (strokeColor) {
        context.strokeStyle = strokeColor;
        context.stroke();
    }
}

export function drawRect(context: CanvasRenderingContext2D, {x, y, w, h}: Rect, reverse = false): void {
    if (reverse) {
        context.moveTo(x, y);
        context.lineTo(x, y + h);
        context.lineTo(x + w, y + h);
        context.lineTo(x + w, y);
    } else {
        context.rect(x, y, w, h);
    }
}

export function renderBar(
    context: CanvasRenderingContext2D,
    {x, y, w, h}: Rect,
    p: number,
    fillColor: string,
    backColor?: string
): void {
    if (backColor) {
        context.fillStyle = backColor;
        context.fillRect(x, y, w, h);
    }
    context.fillStyle = fillColor;
    context.fillRect(x, y, w * Math.max(0, Math.min(1,p)), h);
}
