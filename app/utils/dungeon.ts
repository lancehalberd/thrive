import { chaser } from 'app/enemies/chaser';
import { circler } from 'app/enemies/circler';
import { lord } from 'app/enemies/lord';
import { turret } from 'app/enemies/turret';
import { createEnemy } from 'app/utils/enemy';
import { findClosestDisc, getTargetVector } from 'app/utils/geometry';
import SRandom from 'app/utils/SRandom';

const platformSizes = [300, 500, 800];

export function createTreeDungeon(seed: number, radius: number, level: number): Dungeon {
    const discs: Disc[] = [];
    const enemies: Enemy[] = [];
    const entrance: Entrance = {x: 0, y: 0, radius: 16};

    const dungeonRandomizer = SRandom.seed(seed);


    const startingPlatform: Disc = {
        x: 0,
        y: 0,
        radius: dungeonRandomizer.element(platformSizes),
        links: [],
    }
    discs.push(startingPlatform);
    for (let i = 0; i < 100; i++) {
        dungeonRandomizer.nextSeed();
        const theta = 2 * Math.PI * dungeonRandomizer.generateAndMutate();
        const newDisc = {
            x: radius * Math.cos(theta),
            y: radius * Math.sin(theta),
            radius: dungeonRandomizer.element(platformSizes),
            links: [],
        };
        projectDiscToClosestDisc(discs, newDisc, dungeonRandomizer.range(16, 128));
        discs.push(newDisc);
        // TODO: Add different enemy generators and apply them at random.
        if (dungeonRandomizer.generateAndMutate() < 0.3) {
            enemies.push(createEnemy(newDisc.x, newDisc.y, turret, level));
        } else if (dungeonRandomizer.generateAndMutate() < 0.3) {
            enemies.push(createEnemy(newDisc.x, newDisc.y, lord, level));
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            enemies.push(createEnemy(newDisc.x + 50, newDisc.y, chaser, level));
            enemies.push(createEnemy(newDisc.x - 50, newDisc.y, chaser, level));
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            enemies.push(createEnemy(newDisc.x, newDisc.y + 50, circler, level));
            enemies.push(createEnemy(newDisc.x, newDisc.y - 50, circler, level));
        }
        if (newDisc.x * newDisc.x + newDisc.y * newDisc.y >= radius * radius) {
            break;
        }
    }

    linkDiscs(discs);
    return {
        discs,
        enemies,
        entrance,
    };
}

export function startDungeon(state: GameState, dungeon: Dungeon): void {
    state.hero.x = dungeon.entrance.x;
    state.hero.y = dungeon.entrance.y;
    state.activeDiscs = dungeon.discs;
    state.visibleDiscs = dungeon.discs;
    state.enemies = dungeon.enemies;
}

export function projectDiscToClosestDisc(discs: Disc[], newDisc: Disc, overlap: number): void {
    const closestDisc = findClosestDisc(newDisc, discs);
    const {x, y, distance2} = getTargetVector(closestDisc, newDisc);
    const m = Math.sqrt(distance2);
    const distance = closestDisc.radius + newDisc.radius - overlap;
    newDisc.x = closestDisc.x + x / m * distance;
    newDisc.y = closestDisc.y + y / m * distance;
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
