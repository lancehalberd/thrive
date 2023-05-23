

export function findClosestDisc({x, y}: {x: number, y: number}, discs: Disc[]): Disc {
    let closestDistance2 = Number.MAX_SAFE_INTEGER, closestDisc = discs[0];
    for (const disc of discs) {
        const dx = disc.x - x, dy = disc.y - y;
        const distance2 = dx * dx + dy * dy - disc.radius * disc.radius;
        if (distance2 < closestDistance2) {
            closestDistance2 = distance2;
            closestDisc = disc;
        }
    }
    return closestDisc;
}

export function getTargetVector(circleA: Circle, circleB: Circle): {x: number, y: number, distance2: number} {
    const dx = circleB.x - circleA.x, dy = circleB.y - circleA.y;
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
