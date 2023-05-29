type TextAlign = 'left'|'center'|'right';
type TextBaseline = 'top'|'middle'|'bottom';

export function embossText(context: CanvasRenderingContext2D, text: string, x: number, y: number, {
    textAlign = 'center' as TextAlign,
    textBaseline = 'middle' as TextBaseline,
    size = 16,
    color = 'white',
    borderColor = 'black',
    bold = false,
}) {
    context.textBaseline = textBaseline;
    context.textAlign = textAlign;
    context.font = `${size}px ${bold ? 'bold ' : ''}sans-serif`;
    if (borderColor) {
        context.fillStyle = borderColor;
        context.fillText(text, x - 1, y);
        context.fillText(text, x + 1, y);
        context.fillText(text, x, y + 1);
        context.fillText(text, x, y - 1);
    }
    context.fillStyle = color;
    context.fillText(text, x, y);
}
