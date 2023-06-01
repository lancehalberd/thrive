import { guardian } from 'app/bosses/guardian';
import { CELL_SIZE } from 'app/constants';
import { chaser } from 'app/enemies/chaser';
import { chest } from 'app/enemies/chest';
import { circler } from 'app/enemies/circler';
import { lord } from 'app/enemies/lord';
import { turret } from 'app/enemies/turret';
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

export function createDisc(props: Partial<Disc>): Disc {
    return {
        x: 0,
        y: 0,
        radius: 400,
        links: [],
        enemies: [],
        portals: [],
        loot: [],
        ...props,
    };
}

export function getCellCoordinates(state: GameState, x = state.hero.x, y = state.hero.y): Point {
    return {
        x: Math.floor(x / CELL_SIZE),
        y: Math.floor(-y / CELL_SIZE),
    }
}

function addCellTohistory(state: GameState, cell: WorldCell): void {
    const index = state.recentCells.indexOf(cell);
    if (index) {
        state.recentCells.splice(index, 1);
    }
    state.recentCells.unshift(cell);

    // Forget about cells that have not been active recently.
    if (state.recentCells.length > 100) {
        const ancientCell = state.recentCells.pop()!;
        state.cellMap.delete(`${ancientCell.x}x${ancientCell.y}`);
    }
}

export function updateActiveCells(state: GameState) {
    state.activeCells = [];
    state.activeDiscs = [];
    state.enemies = [];
    state.loot = [];
    state.portals = [];
    const {x: minX, y: minY} = getCellCoordinates(state, state.hero.x - 3750, state.hero.y + 3750);
    const {x: maxX, y: maxY} = getCellCoordinates(state, state.hero.x + 3750, state.hero.y - 3750);
    for (let cellY = Math.max(0, minY); cellY <= maxY; cellY++) {
        for (let cellX = minX; cellX <= maxX; cellX++) {
            const cellKey = `${cellX}x${cellY}`;
            const cell = state.cellMap.get(cellKey) || createWorldCell(state.worldSeed, {x: cellX, y: cellY});
            addCellTohistory(state, cell);
            state.cellMap.set(cellKey, cell);
            state.activeCells.push(cell);
            state.activeDiscs = [...state.activeDiscs, ...cell.discs];
        }
    }
    state.visibleDiscs = state.activeDiscs;
    for (const disc of state.activeDiscs) {
        disc.enemies = disc.enemies.filter(e => e.life > 0);
        state.enemies = [
            ...state.enemies,
            ...disc.enemies,
        ];
        state.loot = [
            ...state.loot,
            ...disc.loot,
        ];
        state.portals = [
            ...state.portals,
            ...disc.portals,
        ];
    }
}

export function createWorldCell(worldSeed: number, {x, y}: Point): WorldCell {
    const discs: Disc[] = [];
    const level = y + 1;
    const worldRandomizer = SRandom.seed(worldSeed);
    const hasNorthExit = worldRandomizer.addSeed((y + 1) * 1357).random() <= 0.5;
    const hasSouthExit = y > 0 && worldRandomizer.addSeed(y * 1357).random() <= 0.5;
    const cellRandomizer = worldRandomizer.addSeed(x * 37).addSeed(y * 29);

    const cellRadius = CELL_SIZE / 2;

    const c = {x: CELL_SIZE * (x + 0.5), y: -CELL_SIZE * (y + 0.5)};

    let discRandomizer = cellRandomizer.addSeed(79);
    discs.push(createDisc({
        x: c.x + (discRandomizer.generateAndMutate() - 0.5) * CELL_SIZE / 10,
        y: c.y + (discRandomizer.generateAndMutate() - 0.5) * CELL_SIZE / 10,
        radius: discRandomizer.element(platformSizes),
    }));

    const goalDiscs: Disc[] = [];
    let westDisc = createDisc({
        x: c.x - cellRadius,
        y: c.y,
        radius: 400,
    });
    goalDiscs.push(westDisc);
    goalDiscs.push(createDisc({
        x: CELL_SIZE,
        y: c.y,
        radius: 400,
    }));
    let northDisc: Disc|undefined;
    if (hasNorthExit) {
        goalDiscs.push(northDisc = createDisc({
            x: c.x,
            y: c.y - cellRadius,
            radius: 400,
        }));
    }
    if (hasSouthExit) {
        goalDiscs.push(createDisc({
            x: c.x,
            y: CELL_SIZE,
            radius: 400,
        }));
    }
    for (let i = 0; i < 200 && (goalDiscs.length || i < 10); i++) {
        const theta = 2 * Math.PI * discRandomizer.generateAndMutate();
        const newDisc: Disc = createDisc({
            x: c.x + cellRadius * Math.cos(theta),
            y: c.y + cellRadius * Math.sin(theta),
            radius: discRandomizer.element(platformSizes),
        });
        projectDiscToClosestDisc(discs, newDisc, discRandomizer.range(16, 128));
        if ((newDisc.x - c.x) ** 2 + (newDisc.y - c.y) ** 2 >= cellRadius * cellRadius ) {
            continue;
        }
        for (let j = 0; j < goalDiscs.length; j++) {
            const goalDisc = goalDiscs[j];
            const {distance2} = getTargetVector(goalDisc, newDisc);
            if (distance2 <= (goalDisc.radius + newDisc.radius - 16) ** 2) {
                goalDiscs.splice(j--, 1);
            }
        }
        // TODO: Add different enemy generators and apply them at random.
        const enemies = [];
        if (discRandomizer.generateAndMutate() < 0.2) {
            enemies.push(createEnemy(newDisc.x, newDisc.y, turret, level));
        } else if (discRandomizer.generateAndMutate() < 0.1) {
            enemies.push(createEnemy(newDisc.x, newDisc.y, chest, level + 1));
        }
        if (discRandomizer.generateAndMutate() < 0.3) {
            enemies.push(createEnemy(newDisc.x - 50, newDisc.y, chaser, level));
        }
        if (discRandomizer.generateAndMutate() < 0.3) {
            enemies.push(createEnemy(newDisc.x, newDisc.y + 50, circler, level));
        }
        newDisc.enemies = enemies;
        for (const enemy of enemies) {
            enemy.disc = newDisc;
        }
        discs.push(newDisc);
    }
    discs.push(westDisc);
    if (northDisc) {
        discs.push(northDisc);
    }
    linkDiscs(discs);
    return {
        level,
        x, y,
        discs,
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



    const startingPlatform: Disc = createDisc({
        x: 0,
        y: 0,
        radius: 400,
    });
    discs.push(startingPlatform);
    let finished = false;
    for (let i = 0; i < 100 && (!finished || i < 20); i++) {
        dungeonRandomizer.nextSeed();
        const theta = 2 * Math.PI * dungeonRandomizer.generateAndMutate();
        const newDisc: Disc = createDisc({
            x: radius * Math.cos(theta),
            y: radius * Math.sin(theta),
            radius: dungeonRandomizer.element(platformSizes),
        });
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
