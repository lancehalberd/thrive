import { getTargetVector } from 'app/utils/geometry';


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

export function findClosestDiscToDisc(disc: Disc, discs: Disc[]): Disc {
    let closestDistance = Number.MAX_SAFE_INTEGER, closestDisc = discs[0];
    for (const otherDisc of discs) {
        const dx = otherDisc.x - disc.x, dy = otherDisc.y - disc.y;
        const distance = (dx * dx + dy * dy) ** 0.5 - disc.radius - otherDisc.radius;
        if (distance < closestDistance) {
            closestDistance = distance;
            closestDisc = otherDisc;
        }
    }
    return closestDisc;
}

export function createDisc(props: Partial<Disc>): Disc {
    return {
        level: 1,
        name: 'Shinsekai',
        x: 0,
        y: 0,
        radius: 400,
        links: [],
        enemies: [],
        portals: [],
        loot: [],
        holes: [],
        ...props,
    };
}

export function projectDiscToDisc(newDisc: Disc, targetDisc: Disc, overlap: number): void {
    const {x, y, distance2} = getTargetVector(targetDisc, newDisc);
    const m = Math.sqrt(distance2);
    const distance = targetDisc.radius + newDisc.radius - overlap;
    newDisc.x = targetDisc.x + x / m * distance;
    newDisc.y = targetDisc.y + y / m * distance;
}

export function projectDiscToClosestDisc(discs: Disc[], newDisc: Disc, overlap: number): void {
    const closestDisc = findClosestDiscToDisc(newDisc, discs);
    projectDiscToDisc(newDisc, closestDisc, overlap);
}

export function linkDiscs(discs: Disc[]): void {
    for (let i = 0; i < discs.length; i++) {
        const disc = discs[i];
        for (let j = i + 1; j < discs.length; j++) {
            const otherDisc = discs[j];
            const {distance2} = getTargetVector(disc, otherDisc);
            const minDistance = disc.radius + otherDisc.radius - 16;
            if (distance2 <= minDistance * minDistance) {
                disc.links.push(otherDisc);
                otherDisc.links.push(disc);
            }
        }
    }
}
