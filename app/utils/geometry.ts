
export function isPointInRect({x, y, w, h}: Rect, p: {x: number, y: number}): boolean {
    return p.x >= x && p.x <= (x + w) && p.y >= y && p.y <= (y + h);
}

export function doCirclesIntersect(circleA: Circle, circleB: Circle): boolean {
    const radius = circleA.radius + circleB.radius;
    const dx = circleB.x - circleA.x, dy = circleB.y - circleA.y;
    return dx * dx + dy * dy < radius * radius;
}

export function getClosestElement<T extends Geometry>({x, y}: {x: number, y: number}, elements: T[]): T {
    let closestDistance2 = Number.MAX_SAFE_INTEGER, closestElement = elements[0];
    for (const element of elements) {
        const dx = element.x - x, dy = element.y - y;
        const distance2 = dx * dx + dy * dy - element.radius * element.radius;
        if (distance2 < closestDistance2) {
            closestDistance2 = distance2;
            closestElement = element;
        }
    }
    return closestElement;
}

export function getTargetVector(pointA: Point, pointB: Point): {x: number, y: number, distance2: number} {
    const dx = pointB.x - pointA.x, dy = pointB.y - pointA.y;
    const distance2 = dx * dx + dy * dy;
    if (distance2 <= 0) {
        return {x: 1, y: 0, distance2: 0};
    }
    return {x: dx, y: dy, distance2};
}

export function turnTowardsAngle(theta: number, delta: number, targetTheta: number): number {
    const negativeDistance = (theta - targetTheta + 2 * Math.PI ) % (2 * Math.PI);
    const positiveDistance = (targetTheta - theta + 2 * Math.PI) % (2 * Math.PI);
    if (negativeDistance <= delta || positiveDistance <= delta) {
        return targetTheta;
    }
    if (negativeDistance < positiveDistance) {
        return theta - delta;
    }
    return theta + delta;
}
