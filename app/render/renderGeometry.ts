
export function fillCircle(context: CanvasRenderingContext2D, circle: Circle, color?: string|CanvasGradient, strokeColor?: string) {
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

export function drawArc(context: CanvasRenderingContext2D, {x, y, radius}: Circle, startTheta = 0, endTheta = 2 * Math.PI, reverse = false) {
    context.arc(x, y, radius, startTheta, endTheta, reverse);
}

export function drawOval(context: CanvasRenderingContext2D, {x, y, w, h}: Rect, startTheta = 0, endTheta = 2 * Math.PI, reverse = false) {
    context.save();
        context.translate(x, y);
        context.scale(w, h);
        context.arc(0, 0, 1, startTheta, endTheta, reverse);
    context.restore();
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

export function parametricCurve(context: CanvasRenderingContext2D, range: number[], steps: number, getPoint: (v: number) => Point): void {
    const p = getPoint(range[0]);
    context.moveTo(p.x, p.y);
    for (let i = 1; i <= steps; i++) {
        const p = getPoint(range[0] + i * (range[1] - range[0]) / steps);
        context.lineTo(p.x, p.y);
    }
}
