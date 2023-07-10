import { overworldSpiderNova } from 'app/bosses/spider';
import { bandit } from 'app/enemies/bandit';
import { bat } from 'app/enemies/bat';
import { chest } from 'app/enemies/chest';
import { clam } from 'app/enemies/clam';
import { crab } from 'app/enemies/crab';
import { swampDragon } from 'app/enemies/dragon';
import { thrivingReef } from 'app/events/thrivingReef';
import { ent } from 'app/enemies/ent';
import { lord } from 'app/enemies/lord';
import { skeleton } from 'app/enemies/skeleton';
import { greatSlime, slime } from 'app/enemies/slime';
import { scorpion } from 'app/enemies/scorpion';
import { snake } from 'app/enemies/snake';
import { sniper } from 'app/enemies/sniper';
import { squid} from 'app/enemies/squid';
import { swampThing } from 'app/enemies/swampThing';
import { dustDevil, tornado } from 'app/enemies/tornado';
import { turret } from 'app/enemies/turret';
import { urchin } from 'app/enemies/urchin';
import { wolf } from 'app/enemies/wolf';
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
        x: Math.floor(x / window.CELL_SIZE),
        y: Math.floor(-y / window.CELL_SIZE),
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
    // This is 4x the player's sight radius.
    // Note that enemies outside of this radius will not render on the extended map.
    const enemyR2 = 1600 ** 2;
    const itemR2 = 500 ** 2;
    for (const disc of state.activeDiscs) {
        disc.enemies = disc.enemies.filter(e => e.life > 0);
        for (const enemy of disc.enemies) {
            if (getTargetVector(enemy, state.hero).distance2 < enemyR2) {
                state.enemies.push(enemy);
            }
        }
        for (const loot of disc.loot) {
            if (getTargetVector(loot, state.hero).distance2 < itemR2) {
                state.loot.push(loot);
            }
        }
        for (const portal of disc.portals) {
            if (getTargetVector(portal, state.hero).distance2 < itemR2) {
                state.portals.push(portal);
            }
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
    if (cellY === 2) {
        return randomizer.range(4, 5);
    }
    if (cellY === 3) {
        return randomizer.range(6, 8);
    }
    const baseLevel = Math.min(90, 10 * (Math.floor(cellY / 2) - 1));
    if (cellY % 2 === 0) {
        // 9/10/11
        return randomizer.range(baseLevel - 1, baseLevel + 1);
    }
    // 13/14/15
    return randomizer.range(baseLevel + 3, baseLevel + 5);
}



function getBiome(cellY: number, randomizer: typeof SRandom): Biome {
    // There is a 20% chance to spawn lower tier biomes at higher tiers.
    // We always reduce by 2+ tiers so that the same tier doesn't appear at very different
    // levels next to each other. If that happens, a player can accidentally enter more
    // difficult areas without any warning.
    for (let alternateY = cellY - 4; alternateY >= 0; alternateY -= 4) {
        if (randomizer.generateAndMutate() < 0.05) {
            return getBiome(alternateY, randomizer);
        }
    }
    /*if (cellY >= 4 && randomizer.generateAndMutate() < 0.2) {
        return getBiome(cellY - 4, randomizer);
    } else if (cellY >= 2 && cellY < 4 && randomizer.generateAndMutate() < 0.2) {
        return getBiome(cellY - 2, randomizer);
    }*/
    if (cellY <= 1) {
        // Tan sand with blue sides
        return {
            name: 'Beach',
            color: '#FC8',
            centerColor: '#FDB',
            topEdgeColor: '#4CF',
            bottomEdgeColor: '#28F',
        };
    }
    if (cellY <= 3) {
        // Yellow sand, yellow sides
        return {
            name: 'Desert',
            color: '#FE4',
            centerColor: '#FF8',
            topEdgeColor: '#DC2',
            bottomEdgeColor: '#BA0',
        };
    }
    if (cellY <= 5) {
        // Grass green, earth brown sides
        return {
            name: 'Field',
            color: '#4E8',
            centerColor: '#8FA',
            topEdgeColor: '#640',
            bottomEdgeColor: '#320',
        };
    }
    if (cellY <= 7) { // Level 10
        // Dark green, earth brown sides
        return {
            name: 'Forest',
            color: '#080',
            centerColor: '#0B4',
            topEdgeColor: '#640',
            bottomEdgeColor: '#320',
        };
    }
    if (cellY <= 9) {
        // Mustard green with matching sides
        return {
            name: 'Swamp',
            color: '#682',
            centerColor: '#8A4',
            topEdgeColor: '#350',
            bottomEdgeColor: '#230',
        };
    }
    if (cellY <= 11) { // Level 30
        return {
            name: 'Foothills',
            // Light bluish-green grass
            color: '#6FA',
            centerColor: '#AFC',
            // lighter brown earth sides
            topEdgeColor: '#862',
            bottomEdgeColor: '#542',
        };
    }
    if (cellY <= 13) {
        return {
            name: 'Mountains',
            // Very slightly brown grey
            color: '#998',
            centerColor: '#BBA',
            topEdgeColor: '#887',
            bottomEdgeColor: '#665',
        };
    }
    if (cellY <= 15) { // Level 50
        return {
            name: 'Frozen Peaks',
            // Very pale blue ice/snow
            color: '#CDF',
            centerColor: '#DEF',
            // Pale blue top layer of ice/snow
            topEdgeColor: '#BCF',
            // Dark grey stone
            bottomEdgeColor: '#666',
        };
    }
    if (cellY <= 17) { // Level 60
        return {
            name: 'Descent',
            // Monochrome grey, but not too dark
            color: '#999',
            // Center color is darker than base color
            centerColor: '#777',
            topEdgeColor: '#555',
            bottomEdgeColor: '#333',
        };
    }
    if (cellY <= 19) { // Level 70
        return {
            name: 'Badlands',
            // Sickly yellow brown surface
            color: '#996',
            centerColor: '#AA5',
            topEdgeColor: '#885',
            bottomEdgeColor: '#553',
        };
    }
    if (cellY <= 21) { // Level 80
        return {
            name: 'Inferno',
            //Top is burning fire/lava surface
            color: '#F94',
            centerColor: '#FC0',
            // Red cool lava layer
            topEdgeColor: '#C42',
            // Bright orange molten core
            bottomEdgeColor: '#FC0',
        };
    }
    // Level 90
    return {
        name: 'Abyss',
            // Very dark base color has poor contrast with black background
            color: '#111',
            // Slightly lighter center color so it doesn't look like a pit.
            centerColor: '#222',
            // Purple edges
            topEdgeColor: '#A6A',
            bottomEdgeColor: '#424',
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
        return;
    }
    if (disc.name === 'Desert') {
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y, turret, disc.level, disc);
        } else if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y, lord, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.1) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 0.5) {
            createEnemy(state, disc.x, disc.y - 100, scorpion, disc.level, disc);
        }
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 1) {
            createEnemy(state, disc.x, disc.y + 100, dustDevil, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.5) {
            createEnemy(state, disc.x + 100, disc.y, skeleton, disc.level, disc);
        }
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.5) {
            createEnemy(state, disc.x - 100, disc.y, skeleton, disc.level, disc);
        }
        return;
    }
    if (disc.name === 'Field') {
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.5) {
            createEnemy(state, disc.x, disc.y, bandit, disc.level, disc);
        } else if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.5) {
            createEnemy(state, disc.x, disc.y, lord, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.1) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 1) {
            createEnemy(state, disc.x, disc.y - 100, wolf, disc.level, disc);
        }
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 1) {
            createEnemy(state, disc.x, disc.y + 100, wolf, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.5) {
            createEnemy(state, disc.x + 100, disc.y, slime, disc.level, disc);
        }
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.5) {
            createEnemy(state, disc.x - 100, disc.y, slime, disc.level, disc);
        }
        return;
    }
    if (disc.name === 'Forest') {
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.6) {
            createEnemy(state, disc.x, disc.y, ent, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, turret, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.1) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y - 100, overworldSpiderNova, disc.level, disc);
        }
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y + 100, overworldSpiderNova, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.5) {
            createEnemy(state, disc.x + 100, disc.y, snake, disc.level, disc);
        }
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.5) {
            createEnemy(state, disc.x - 100, disc.y, sniper, disc.level, disc);
        }
        return;
    }
    if (disc.name === 'Swamp') {
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, swampDragon, disc.level, disc);
        } else if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, greatSlime, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.5) {
            createEnemy(state, disc.x - 100, disc.y, swampThing, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x + 100, disc.y, snake, disc.level, disc);
        }
        return;
    }
    if (disc.name === 'Foothills') {
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.2) {
            // PLACEHOLDER for centipede
            createEnemy(state, disc.x, disc.y, ent, disc.level, disc);
        } else if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.2) {
            // PLACEHOLDER for trebuchet
            createEnemy(state, disc.x, disc.y, turret, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for ronin
            createEnemy(state, disc.x - 50, disc.y, bandit, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for ronin
            createEnemy(state, disc.x + 50, disc.y, bandit, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y + 50, wolf, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y - 50, wolf, disc.level, disc);
        }
    }
    if (disc.name === 'Mountains') {
        if (disc.radius >= 300 && randomizer.generateAndMutate() < 1) {
            createEnemy(state, disc.x, disc.y + 100, tornado, disc.level, disc);
        } else if (disc.radius >= 300 && randomizer.generateAndMutate() < 0.2) {
            // PLACEHOLDER for Golem
            createEnemy(state, disc.x, disc.y, turret, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for naga priest
            createEnemy(state, disc.x - 50, disc.y, squid, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for naga priest
            createEnemy(state, disc.x + 50, disc.y, squid, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for naga wizard
            createEnemy(state, disc.x, disc.y + 50, sniper, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for naga wizard
            createEnemy(state, disc.x, disc.y - 50, sniper, disc.level, disc);
        }
    }
    if (disc.name === 'Frozen Peaks') {
        if (randomizer.generateAndMutate() < 0.2) {
            // PLACEHOLDER for Giant Snowflake
            createEnemy(state, disc.x, disc.y, ent, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.2) {
            // PLACEHOLDER for Frost Dragon
            createEnemy(state, disc.x, disc.y, swampDragon, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for Yeti
            createEnemy(state, disc.x - 50, disc.y, crab, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for Yeti
            createEnemy(state, disc.x + 50, disc.y, crab, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for White Wolf
            createEnemy(state, disc.x, disc.y + 50, wolf, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for White Wolf
            createEnemy(state, disc.x, disc.y - 50, wolf, disc.level, disc);
        }
    }
    if (disc.name === 'Descent') {
        if (randomizer.generateAndMutate() < 0.2) {
            // PLACEHOLDER for Naga Mystic
            createEnemy(state, disc.x, disc.y, lord, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.2) {
            // PLACEHOLDER for Mimic
            createEnemy(state, disc.x, disc.y, clam, disc.level + 1, disc);
        }  else if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for Naga Priest
            createEnemy(state, disc.x - 50, disc.y, scorpion, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for Naga Wizard
            createEnemy(state, disc.x + 50, disc.y, slime, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for vampire bat
            createEnemy(state, disc.x, disc.y + 50, bat, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for vampire bat
            createEnemy(state, disc.x, disc.y - 50, bat, disc.level, disc);
        }
    }
    if (disc.name === 'Badlands') {
        if (randomizer.generateAndMutate() < 0.2) {
            // PLACEHOLDER for Necromancer
            createEnemy(state, disc.x, disc.y, lord, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.2) {
            // PLACEHOLDER for Trebuchet
            createEnemy(state, disc.x, disc.y, ent, disc.level + 1, disc);
        }  else if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x - 50, disc.y, swampThing, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x + 50, disc.y, swampThing, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y + 50, sniper, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            createEnemy(state, disc.x, disc.y - 50, sniper, disc.level, disc);
        }
    }
    if (disc.name === 'Inferno') {
        if (randomizer.generateAndMutate() < 0.2) {
            // PLACEHOLDER for Flame Cyclone
            createEnemy(state, disc.x, disc.y, tornado, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.2) {
            // PLACEHOLDER for Flame Dragon
            createEnemy(state, disc.x, disc.y, swampDragon, disc.level, disc);
        } else if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for Magma Thing
            createEnemy(state, disc.x - 50, disc.y, swampThing, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for Magma Thing
            createEnemy(state, disc.x + 50, disc.y, swampThing, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for ???
            createEnemy(state, disc.x, disc.y + 50, overworldSpiderNova, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.3) {
            // PLACEHOLDER for ???
            createEnemy(state, disc.x, disc.y - 50, overworldSpiderNova, disc.level, disc);
        }
    }
    if (disc.name === 'Abyss') {
        if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y, ent, disc.level, disc);
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
            createEnemy(state, disc.x - 50, disc.y, scorpion, disc.level, disc);
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

    const cellRadius = window.CELL_SIZE / 2;
    const biome = getBiome(y, cellRandomizer);

    const c = {x: window.CELL_SIZE * (x + 0.5), y: -window.CELL_SIZE * (y + 0.5)};

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
            x: c.x + (discRandomizer.generateAndMutate() - 0.5) * window.CELL_SIZE / 10,
            y: c.y + (discRandomizer.generateAndMutate() - 0.5) * window.CELL_SIZE / 10,
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
