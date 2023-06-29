import { CELL_SIZE } from 'app/constants';
import { overworldSpiderNova } from 'app/bosses/spider';
import { bat } from 'app/enemies/bat';
import { chaser } from 'app/enemies/chaser';
import { chest } from 'app/enemies/chest';
import { clam } from 'app/enemies/clam';
import { crab } from 'app/enemies/crab';
import { thrivingReef } from 'app/events/thrivingReef';
import { ent } from 'app/enemies/ent';
import { lord } from 'app/enemies/lord';
import { slime } from 'app/enemies/slime';
import { snake } from 'app/enemies/snake';
import { sniper } from 'app/enemies/sniper';
import { squid} from 'app/enemies/squid';
import { turret } from 'app/enemies/turret';
import { urchin } from 'app/enemies/urchin';
import { createDisc, findClosestDiscToDisc, linkDiscs, projectDiscToClosestDisc } from 'app/utils/disc';
import { createEnemy } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';
import { refillAllPotions } from 'app/utils/hero';
import { saveGame } from 'app/saveGame'

import SRandom from 'app/utils/SRandom';

export function returnToOverworld(state: GameState): void {
    delete state.dungeon;
    // If the player happens to leave during a boss fight, we have to clear the
    // boss in order to automatically assign them to a different disc.
    if (state.hero.disc?.boss) {
        delete state.hero.disc.boss;
    }
    state.hero.x = state.hero.overworldX;
    state.hero.y = state.hero.overworldY;
    clearNearbyEnemies(state);
    refillAllPotions(state);
    saveGame(state);
}

export function addOverworldPortalToDisc({x, y}: Point, disc: Disc): Portal {
    const portal = {
        x, y, radius: 40,
        disc,
        name: 'Overworld',
        activate(state: GameState) {
            returnToOverworld(state);
        },
    };
    disc.portals.push(portal);
    return portal;
}


export function getCellCoordinates(state: GameState, x = state.hero.x, y = state.hero.y): Point {
    return {
        x: Math.floor(x / CELL_SIZE),
        y: Math.floor(-y / CELL_SIZE),
    }
}

export function clearNearbyEnemies(state: GameState): void {
    updateActiveCells(state);
    for (const enemy of state.enemies) {
        if (getTargetVector(state.hero, enemy).distance2 <= 1000 ** 2) {
            // This will cause the enemy to be cleaned up when `updateActiveCells` is called again.
            enemy.life = 0;
        }
    }
    updateActiveCells(state);
}


export function updateActiveCells(state: GameState) {
    // Cells only apply when on the overworld.
    if (!state.dungeon) {
        state.activeDiscs = [];
        state.activeCells = [];
        const {x: minX, y: minY} = getCellCoordinates(state, state.hero.x - 3750, state.hero.y + 3750);
        const {x: maxX, y: maxY} = getCellCoordinates(state, state.hero.x + 3750, state.hero.y - 3750);
        for (let cellY = Math.max(0, minY); cellY <= maxY; cellY++) {
            for (let cellX = minX; cellX <= maxX; cellX++) {
                const cellKey = `${cellX}x${cellY}`;
                const cell = state.cellMap.get(cellKey) || createWorldCell(state, {x: cellX, y: cellY});
                addCellTohistory(state, cell);
                state.cellMap.set(cellKey, cell);
                state.activeCells.push(cell);
                state.activeDiscs = [...state.activeDiscs, ...cell.discs];
            }
        }
        state.visibleDiscs = state.activeDiscs;
    }
    state.enemies = [];
    state.loot = [];
    state.portals = [];
    state.holes = [];
    for (const disc of state.activeDiscs) {
        disc.enemies = disc.enemies.filter(e => e.life > 0);
        for (const enemy of disc.enemies) {
            state.enemies.push(enemy);
        }
        for (const loot of disc.loot) {
            state.loot.push(loot);
        }
        for (const portal of disc.portals) {
            state.portals.push(portal);
        }
        for (const hole of disc.holes) {
            state.holes.push(hole);
        }
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


function getCellLevel(randomizer: typeof SRandom, cellY: number): number {
    if (cellY === 0) {
        return 1;
    }
    if (cellY === 1) {
        return randomizer.range(2, 3);
    }
    if (cellY <= 3) {
        return randomizer.range(5, 8);
    }
    const baseLevel = Math.min(90, 10 * (Math.floor(cellY / 2) - 1));
    if (cellY % 2 === 0) {
        // 10/11/12
        return randomizer.range(baseLevel, baseLevel + 2);
    }
    // 13/14/15
    return randomizer.range(baseLevel + 3, baseLevel + 5);
}



function getBiome(cellY: number, randomizer: typeof SRandom): Biome {
    // There is a 20% chance to spawn lower tier biomes at higher tiers.
    // We always reduce by 2+ tiers so that the same tier doesn't appear at very different
    // levels next to each other. If that happens, a player can accidentally enter more
    // difficult areas without any warning.
    if (cellY >= 4 && randomizer.generateAndMutate() < 0.2) {
        return getBiome(cellY - 4, randomizer);
    } else if (cellY >= 2 && cellY < 4 && randomizer.generateAndMutate() < 0.2) {
        return getBiome(cellY - 2, randomizer);
    }
    if (cellY === 0) {
        return {
            name: 'Beach',
            color: '#FC8',
            centerColor: '#FDB',
            topEdgeColor: '#4CF',
            bottomEdgeColor: '#28F',
        };
    }
    if (cellY === 1) {
        return {
            name: 'Desert',
            color: '#FE4',
            centerColor: '#FF8',
            topEdgeColor: '#DC2',
            bottomEdgeColor: '#BA0',
        };
    }
    if (cellY <= 3) {
        return {
            name: 'Field',
            color: '#4E8',
            centerColor: '#8FA',
            topEdgeColor: '#640',
            bottomEdgeColor: '#320',
        };
    }
    if (cellY <= 5) { // Level 10
        return {
            name: 'Forest',
            color: '#080',
            centerColor: '#0B4',
            topEdgeColor: '#640',
            bottomEdgeColor: '#320',
        };
    }
    if (cellY <= 7) {
        return {
            name: 'Swamp',
            color: '#682',
            centerColor: '#8A4',
            topEdgeColor: '#350',
            bottomEdgeColor: '#230',
        };
    }
    if (cellY <= 9) { // Level 30
        return {
            name: 'Foothills',
            color: '#6FA',
            centerColor: '#AFC',
            topEdgeColor: '#862',
            bottomEdgeColor: '#542',
        };
    }
    if (cellY <= 11) {
        return {
            name: 'Mountains',
        };
    }
    if (cellY <= 13) { // Level 50
        return {
            name: 'Frozen Peaks',
        };
    }
    if (cellY <= 15) { // Level 60
        return {
            name: 'Descent',
        };
    }
    if (cellY <= 17) { // Level 70
        return {
            name: 'Badlands',
        };
    }
    if (cellY <= 19) { // Level 80
        return {
            name: 'Inferno',
        };
    }
    // Level 90
    return {
        name: 'Abyss',
    };
}


function addOverworldEnemiesToDisc(state: GameState, randomizer: typeof SRandom, disc: Disc): void {
    if (disc.name === 'Beach') {
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y, clam, disc.level, disc);
        } else if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y, urchin, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.4) {
            createEnemy(state, disc.x, disc.y - 100, crab, disc.level, disc);
            if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.2) {
                createEnemy(state, disc.x, disc.y + 100, crab, disc.level, disc);
            }
        }
        if (randomizer.generateAndMutate() < 0.4) {
            createEnemy(state, disc.x + 100, disc.y, squid, disc.level, disc);
            if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.2) {
                createEnemy(state, disc.x, disc.y - 100, squid, disc.level, disc);
            }
        }
    } else if (disc.name === 'Desert') {
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y, turret, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.1) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y - 100, slime, disc.level, disc);
        }
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y + 100, slime, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x + 100, disc.y, chaser, disc.level, disc);
        }
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x - 100, disc.y, chaser, disc.level, disc);
        }
    } else if (disc.name === 'Field') {
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y, urchin, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.1) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y - 100, overworldSpiderNova, disc.level, disc);
        }
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y + 100, chaser, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x + 100, disc.y, bat, disc.level, disc);
        }
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x - 100, disc.y, slime, disc.level, disc);
        }
    } else if (disc.name === 'Forest') {
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.6) {
            createEnemy(state, disc.x, disc.y, ent, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y, turret, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.1) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y - 100, overworldSpiderNova, disc.level, disc);
        }
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y + 100, overworldSpiderNova, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x + 100, disc.y, snake, disc.level, disc);
        }
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x - 100, disc.y, sniper, disc.level, disc);
        }
    }  else {
        // For undefined biomes, just include a variety of enemies that can drop dungeons.
        if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, lord, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, urchin, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, turret, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, clam, disc.level, disc);
        }  else if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x - 50, disc.y, chaser, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x + 50, disc.y, slime, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y + 50, bat, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y - 50, overworldSpiderNova, disc.level, disc);
        }
    }
}


const bonusConnectionChance = 0.25;
function cellHasNorthExit(x: number, y: number, worldRandomizer: typeof SRandom): boolean {
    const modulus = Math.min(y + 2, 6);
    const rowRandomizer = worldRandomizer.addSeed((y + 1) * 1357);
    const offset = (rowRandomizer.addSeed(934322).random() * modulus) | 0;
    if ((x + offset) % modulus === 0) {
        return true;
    }
    return rowRandomizer.addSeed(x * 37).random() <= bonusConnectionChance;
}

const debugDiscs = false;
const platformSizes = [200, 350, 350, 350, 500, 500];
export function createWorldCell(state: GameState, {x, y}: Point): WorldCell {
    const discs: Disc[] = [];
    const worldRandomizer = SRandom.seed(state.worldSeed);
    const hasNorthExit = cellHasNorthExit(x, y, worldRandomizer);
    const hasSouthExit = y > 0 && cellHasNorthExit(x, y - 1, worldRandomizer);
    const hasEventDisc = worldRandomizer.addSeed(y * 36327).addSeed(x * 37).random() <= 0.1;
    const cellRandomizer = worldRandomizer.addSeed(x * 37).addSeed(y * 29);
    const level = getCellLevel(cellRandomizer, y);

    const cellRadius = CELL_SIZE / 2;
    const biome = getBiome(y, cellRandomizer);

    const c = {x: CELL_SIZE * (x + 0.5), y: -CELL_SIZE * (y + 0.5)};

    let discRandomizer = cellRandomizer.addSeed(79);

    const goalDiscs: Disc[] = [];
    const extraDiscs: Disc[] = [];
    const eastDisc = createDisc({
        level,
        ...biome,
        x: c.x + cellRadius,
        y: c.y,
        radius: 400,
    });
    extraDiscs.push(eastDisc);
    goalDiscs.push(eastDisc);
    const westDisc = createDisc({
        level,
        ...biome,
        x: c.x - cellRadius,
        y: c.y,
        radius: 400,
    });
    extraDiscs.push(westDisc);
    goalDiscs.push(westDisc);
    let northDisc: Disc|undefined;
    if (hasNorthExit) {
        goalDiscs.push(northDisc = createDisc({
            level,
            ...biome,
            ...(debugDiscs ? {color: 'blue'} : {}),
            x: c.x,
            y: c.y - cellRadius,
            radius: 400,
        }));
        extraDiscs.push(northDisc);
    }
    if (hasSouthExit) {
        const southDisc: Disc = createDisc({
            level,
            ...biome,
            x: c.x,
            y: c.y + cellRadius,
            radius: 400,
        });
        goalDiscs.push(southDisc);
        extraDiscs.push(southDisc);
    }
    let eventDisc: Disc|undefined;
    if (hasEventDisc) {
        discs.push(eventDisc = createDisc({
            level,
            ...biome,
            x: c.x,
            y: c.y,
            name: 'Thriving Reef',
            color: '#28F',
            centerColor: '#4CF',
            topEdgeColor: '#12D',
            bottomEdgeColor: '#00A',
            radius: 600,
        }));
        createEnemy(state, eventDisc.x, eventDisc.y, thrivingReef, eventDisc.level + 1, eventDisc);
    } else {
        discs.push(createDisc({
            level,
            ...biome,
            x: c.x + (discRandomizer.generateAndMutate() - 0.5) * CELL_SIZE / 10,
            y: c.y + (discRandomizer.generateAndMutate() - 0.5) * CELL_SIZE / 10,
            radius: discRandomizer.element(platformSizes),
        }));
    }

    let i = 0;
    for (i = 0; i < 200 && (goalDiscs.length || i < 20); i++) {
        /*const theta = 2 * Math.PI * discRandomizer.generateAndMutate();
        const newDisc: Disc = createDisc({
            level,
            ...biome,
            x: c.x + cellRadius * Math.cos(theta),
            y: c.y + cellRadius * Math.sin(theta),
            radius: discRandomizer.element(platformSizes),
        });*/
        const newDisc: Disc = createDisc({
            level,
            ...biome,
            x: c.x + cellRadius * (1 - 2 * discRandomizer.generateAndMutate()),
            y: c.y + cellRadius * (1 - 2 * discRandomizer.generateAndMutate()),
            radius: discRandomizer.element(platformSizes),
        });
        // Attempt to adjust the position of the disc until it satisfies placement criteria.
        let positionIsGood = false;
        for (let j = 0; j < 10 && !positionIsGood && newDisc.radius >= 150; j++) {
            positionIsGood = adjustDiscPosition(discs, extraDiscs, newDisc, 24, 80, discRandomizer.range(24, 80));
            if (!positionIsGood
                || Math.abs(newDisc.x - c.x) >= (cellRadius - newDisc.radius + 32)
                || Math.abs(newDisc.y - c.y) >= (cellRadius - newDisc.radius + 32)
            ) {
                newDisc.radius -= 20;
            }
        }
        // Discard the disc if the placement is still bad.
        if (!positionIsGood
            || Math.abs(newDisc.x - c.x) >= (cellRadius - newDisc.radius + 32)
            || Math.abs(newDisc.y - c.y) >= (cellRadius - newDisc.radius + 32)
        ) {
            continue;
        }
        for (let j = 0; j < goalDiscs.length; j++) {
            const goalDisc = goalDiscs[j];
            const {distance2} = getTargetVector(goalDisc, newDisc);
            if (distance2 <= (goalDisc.radius + newDisc.radius - 16) ** 2) {
                goalDiscs.splice(j--, 1);
            }
        }
        addOverworldEnemiesToDisc(state, discRandomizer, newDisc);
        discs.push(newDisc);
    }
    for (const remainingGoal of goalDiscs) {
        const closestDisc = findClosestDiscToDisc(remainingGoal, discs);
        const {x, y, distance2} = getTargetVector(remainingGoal, closestDisc);
        const mag = Math.sqrt(distance2);
        const dx = x / mag, dy = y / mag;
        const p = (remainingGoal.radius + (mag - remainingGoal.radius - closestDisc.radius) / 2);
        discs.push(createDisc({
            level,
            ...biome,
            ...(debugDiscs ? {color: 'red'} : {}),
            x: remainingGoal.x + dx * p,
            y: remainingGoal.y + dy * p,
            radius: (mag - remainingGoal.radius - closestDisc.radius + 48),
        }));
    }
    // The west+north discs are part of this cell, but the east+south discs are not.
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

function adjustDiscPosition(discs: Disc[], otherDiscs: Disc[], disc: Disc, minOverlap: number, maxOverlap: number, targetOverlap: number): boolean {
    projectDiscToClosestDisc(discs, disc, targetOverlap);
    const closestDisc = findClosestDiscToDisc(disc, [...discs, ...otherDiscs]);
    // Return false if the closest disc does has more overlap than `maxOverlap`.
    return getTargetVector(disc, closestDisc).distance2 >= (disc.radius + closestDisc.radius - maxOverlap) ** 2;
}
