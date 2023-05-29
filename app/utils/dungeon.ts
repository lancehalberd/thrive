import { guardian } from 'app/bosses/guardian';
import { chaser } from 'app/enemies/chaser';
import { chest } from 'app/enemies/chest';
import { circler } from 'app/enemies/circler';
import { lord } from 'app/enemies/lord';
import { turret } from 'app/enemies/turret';
import { renderMinimap } from 'app/render/renderGame';
import { createEnemy } from 'app/utils/enemy';
import { findClosestDisc, getTargetVector } from 'app/utils/geometry';
import { refillAllPotions } from 'app/utils/hero';
import SRandom from 'app/utils/SRandom';

const platformSizes = [200, 350, 500];

export function getTreeDungeonPortal(x: number, y: number, level: number, seed: number) {
    level = Math.max(0, Math.min(100, level));
    return {
        x, y, radius: 40,
        level,
        name: 'Tree',
        activate(state: GameState) {
            startDungeon(state, createTreeDungeon(Math.random(), 2000 + 40 * level, level));
        },
    };
}

export function createTreeDungeon(seed: number, radius: number, level: number): Dungeon {
    const discs: Disc[] = [];
    const portals: Portal[] = [];
    const enemies: Enemy[] = [];
    const entrance: Entrance = {x: 0, y: 0, radius: 16};
    const dungeonRandomizer = SRandom.seed(seed);
    if (level > 1) {
        portals.push(getTreeDungeonPortal(0, 0, level - 1, dungeonRandomizer.generateAndMutate()));
    }



    const startingPlatform: Disc = {
        x: 0,
        y: 0,
        radius: 400,
        links: [],
    }
    discs.push(startingPlatform);
    let finished = false;
    for (let i = 0; i < 100 && (!finished || i < 20); i++) {
        dungeonRandomizer.nextSeed();
        const theta = 2 * Math.PI * dungeonRandomizer.generateAndMutate();
        const newDisc: Disc = {
            x: radius * Math.cos(theta),
            y: radius * Math.sin(theta),
            radius: dungeonRandomizer.element(platformSizes),
            links: [],
        };
        projectDiscToClosestDisc(discs, newDisc, dungeonRandomizer.range(16, 128));
        if (newDisc.x * newDisc.x + newDisc.y * newDisc.y >= radius * radius) {
            // Only one disc is allowed to spawn outside of the radius.
            if (!finished) {
                finished = true;
                newDisc.radius = 400;
                projectDiscToClosestDisc(discs, newDisc, dungeonRandomizer.range(16, 128));
                newDisc.boss = createEnemy(newDisc.x, newDisc.y, guardian, Math.min(100, level + 2));
                newDisc.boss.isBoss = true;
                enemies.push(newDisc.boss);
                discs.push(newDisc);
            }
            continue;
        }
        discs.push(newDisc);
        // TODO: Add different enemy generators and apply them at random.
        if (dungeonRandomizer.generateAndMutate() < 0.3) {
            enemies.push(createEnemy(newDisc.x, newDisc.y, turret, level));
        } else if (dungeonRandomizer.generateAndMutate() < 0.3) {
            enemies.push(createEnemy(newDisc.x, newDisc.y, lord, level));
        } else if (dungeonRandomizer.generateAndMutate() < 0.3) {
            enemies.push(createEnemy(newDisc.x, newDisc.y, chest, level + 1));
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            enemies.push(createEnemy(newDisc.x + 50, newDisc.y, chaser, level));
            enemies.push(createEnemy(newDisc.x - 50, newDisc.y, chaser, level));
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            enemies.push(createEnemy(newDisc.x, newDisc.y + 50, circler, level));
            enemies.push(createEnemy(newDisc.x, newDisc.y - 50, circler, level));
        }
    }
    linkDiscs(discs);
    return {
        name: 'tree',
        level,
        discs,
        enemies,
        entrance,
        portals,
    };
}

export function startDungeon(state: GameState, dungeon: Dungeon): void {
    state.hero.x = dungeon.entrance.x;
    state.hero.y = dungeon.entrance.y;
    state.activeDiscs = dungeon.discs;
    state.visibleDiscs = dungeon.discs;
    state.enemies = dungeon.enemies;
    state.loot = [];
    state.portals = dungeon.portals;
    renderMinimap(state.visibleDiscs);
    refillAllPotions(state);
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
