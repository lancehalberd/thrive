import { guardian } from 'app/bosses/guardian';
import { skissue } from 'app/bosses/skissue';
import { spider } from 'app/bosses/spider';
import { bat } from 'app/enemies/bat';
import { chaser } from 'app/enemies/chaser';
import { chest } from 'app/enemies/chest';
import { circler } from 'app/enemies/circler';
import { clam, giantClam } from 'app/enemies/clam';
import { crab } from 'app/enemies/crab';
import { lord } from 'app/enemies/lord';
import { greatSlime, megaSlime } from 'app/enemies/slime';
import { squid} from 'app/enemies/squid';
import { turret } from 'app/enemies/turret';
import { urchin } from 'app/enemies/urchin';
import { saveGame } from 'app/saveGame';
import { createDisc, linkDiscs, projectDiscToClosestDisc, projectDiscToDisc } from 'app/utils/disc';
import { createEnemy } from 'app/utils/enemy';
import { refillAllPotions } from 'app/utils/hero';
import { addOverworldPortalToDisc, updateActiveCells } from 'app/utils/overworld';
import SRandom from 'app/utils/SRandom';
import { createSpiderDenDungeon } from 'app/dungeons/spiderDen';

const platformSizes = [200, 350, 500];

export const dungeonTypes: DungeonType[] = ['reef', 'cave', 'tree', 'arena', 'spiderDen'];


export function addDungeonPortalToDisc({x, y}: Point, type: DungeonType, level: number, seed = Math.random(), disc: Disc): Portal {
    const dungeon = createDungeon(type, level, seed);
    const portal = {
        x, y, radius: 40,
        disc,
        dungeon,
        name: dungeon.name,
        activate(this: Portal, state: GameState) {
            activateDungeonPortal(state, this);
        },
    };
    disc.portals.push(portal);
    return portal;
}

export function getDungeonLevelBonus(type: DungeonType): number {
    if (type === 'reef') return 0;
    if (type === 'cave') return 1;
    if (type === 'tree') return 1;
    if (type === 'arena') return 1;
    if (type === 'spiderDen') return 1;
    return 2;
}

export function createDungeon(type: DungeonType, level: number, seed = Math.random()) {
    const radius = 1600 + 8 * level;
    level = Math.max(0, Math.min(100, level + getDungeonLevelBonus(type)));
    if (type === 'reef') return createReefDungeon(seed, radius, level);
    if (type === 'cave') return createCaveDungeon(seed, radius, level);
    if (type === 'arena') return createArenaDungeon(seed, radius, level);
    if (type === 'spiderDen') return createSpiderDenDungeon(seed, level);
    return createTreeDungeon(seed, radius, level);
}



export function createTreeDungeon(seed: number, radius: number, level: number): Dungeon {
    const name = 'Tree';
    const discs: Disc[] = [];
    const entrance: Entrance = {x: 0, y: 0, radius: 16};
    const dungeonRandomizer = SRandom.seed(seed);
    const startingPlatform: Disc = createDisc({
        level,
        name,
        x: entrance.x,
        y: entrance.y,
        radius: 400,
    });
    addOverworldPortalToDisc(entrance, startingPlatform);
    discs.push(startingPlatform);
    let finished = false;
    for (let i = 0; i < 100 && (!finished || i < 20); i++) {
        dungeonRandomizer.nextSeed();
        const theta = 2 * Math.PI * dungeonRandomizer.generateAndMutate();
        const newDisc: Disc = createDisc({
            level,
            name,
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
                newDisc.boss = createEnemy(newDisc.x, newDisc.y, guardian, Math.min(100, level + 2), newDisc);
                newDisc.boss.isBoss = true;
                discs.push(newDisc);
            }
            continue;
        }
        discs.push(newDisc);
        // TODO: Add different enemy generators and apply them at random.
        if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(newDisc.x, newDisc.y, turret, level, newDisc);
        } else if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(newDisc.x, newDisc.y, lord, level, newDisc);
        } else if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(newDisc.x, newDisc.y, chest, level + 1, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            createEnemy(newDisc.x + 50, newDisc.y, chaser, level, newDisc);
            createEnemy(newDisc.x - 50, newDisc.y, chaser, level, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            createEnemy(newDisc.x, newDisc.y + 50, circler, level, newDisc);
            createEnemy(newDisc.x, newDisc.y - 50, circler, level, newDisc);
        }
    }
    linkDiscs(discs);
    return {
        name,
        level,
        discs,
        entrance,
    };
}


const reefBiome: Biome = {
    name: 'Reef',
    color: '#28F',
    centerColor: '#4CF',
    topEdgeColor: '#12D',
    bottomEdgeColor: '#00A',
}

export function createReefDungeon(seed: number, radius: number, level: number): Dungeon {
    const discs: Disc[] = [];
    const entrance: Entrance = {x: 0, y: radius, radius: 16};
    const dungeonRandomizer = SRandom.seed(seed);
    const startingPlatform: Disc = createDisc({
        level,
        ...reefBiome,
        x: entrance.x,
        y: entrance.y,
        radius: 400,
    });
    addOverworldPortalToDisc(entrance, startingPlatform);
    discs.push(startingPlatform);
    let finished = false;
    for (let i = 0; i < 100 && (!finished || i < 10); i++) {
        dungeonRandomizer.nextSeed();
        const theta = 5 * Math.PI / 4 + Math.PI * dungeonRandomizer.generateAndMutate() / 2;
        const newDisc: Disc = createDisc({
            level,
            ...reefBiome,
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
                newDisc.boss = createEnemy(newDisc.x, newDisc.y, giantClam, Math.min(100, level + 2), newDisc);
                newDisc.boss.isBoss = true;
                discs.push(newDisc);
            }
            continue;
        }
        discs.push(newDisc);
        // TODO: Add different enemy generators and apply them at random.
        if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(newDisc.x, newDisc.y, urchin, level, newDisc);
        } else if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(newDisc.x, newDisc.y, clam, level, newDisc);
        } else if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(newDisc.x, newDisc.y, chest, level + 1, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            createEnemy(newDisc.x + 50, newDisc.y, crab, level, newDisc);
            createEnemy(newDisc.x - 50, newDisc.y, crab, level, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            createEnemy(newDisc.x, newDisc.y + 50, squid, level, newDisc);
            createEnemy(newDisc.x, newDisc.y - 50, squid, level, newDisc);
        }
    }
    linkDiscs(discs);
    return {
        name: reefBiome.name,
        level,
        discs,
        entrance,
    };
}


export function createCaveDungeon(seed: number, radius: number, level: number): Dungeon {
    const name = 'Cave';
    const discs: Disc[] = [];
    const entrance: Entrance = {x: 0, y: 0, radius: 16};
    const dungeonRandomizer = SRandom.seed(seed);
    const startingPlatform: Disc = createDisc({
        level,
        name,
        x: entrance.x,
        y: entrance.y,
        radius: 400,
    });
    addOverworldPortalToDisc(entrance, startingPlatform);
    discs.push(startingPlatform);
    let finished = false;
    let theta = Math.PI / 2;
    for (let i = 0; i < 100 && (!finished || i < 12); i++) {
        theta += Math.PI / 24 + Math.PI / 12 * dungeonRandomizer.generateAndMutate();
        const newDisc: Disc = createDisc({
            level,
            name,
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
                newDisc.boss = createEnemy(newDisc.x, newDisc.y, megaSlime, Math.min(100, level + 2), newDisc);
                newDisc.boss.isBoss = true;
                discs.push(newDisc);
            }
            continue;
        }
        discs.push(newDisc);
        // TODO: Add different enemy generators and apply them at random.
        if (dungeonRandomizer.generateAndMutate() < 0.2) {
            createEnemy(newDisc.x, newDisc.y, greatSlime, level, newDisc);
        } else if (dungeonRandomizer.generateAndMutate() < 0.2) {
            createEnemy(newDisc.x, newDisc.y, chest, level + 1, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            createEnemy(newDisc.x + 50, newDisc.y, bat, level, newDisc);
            createEnemy(newDisc.x - 50, newDisc.y, bat, level, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            createEnemy(newDisc.x, newDisc.y + 50, bat, level, newDisc);
            createEnemy(newDisc.x, newDisc.y - 50, bat, level, newDisc);
        }
    }
    linkDiscs(discs);
    return {
        name,
        level,
        discs,
        entrance,
    };
}


export function createArenaDungeon(seed: number, radius: number, level: number): Dungeon {
    const name = 'Cave';
    const discs: Disc[] = [];
    const entrance: Entrance = {x: 0, y: 0, radius: 16};
    const dungeonRandomizer = SRandom.seed(seed);
    const startingPlatform: Disc = createDisc({
        level,
        name,
        x: entrance.x,
        y: entrance.y,
        radius: 400,
    });
    addOverworldPortalToDisc(entrance, startingPlatform);
    discs.push(startingPlatform);
    const bosses = dungeonRandomizer.shuffle([megaSlime, guardian, giantClam, spider, skissue]);
    const count = bosses.length;
    console.log(bosses);
    for (let i = 0; i < count; i++) {
        const theta = 2 * Math.PI * i / count;
        let previousDisc = startingPlatform;
        for (let j = 0; j < 4; j++) {
            const newDisc: Disc = createDisc({
                level,
                name,
                x: 10000 * Math.cos(theta),
                y: 10000 * Math.sin(theta),
                radius: dungeonRandomizer.element(platformSizes),
            });
            projectDiscToDisc(newDisc, previousDisc, dungeonRandomizer.range(32, 64));
            // TODO: Add different enemy generators and apply them at random.
            if (dungeonRandomizer.generateAndMutate() < 0.2) {
                createEnemy(newDisc.x, newDisc.y, greatSlime, level, newDisc);
            } else if (dungeonRandomizer.generateAndMutate() < 0.2) {
                createEnemy(newDisc.x, newDisc.y, chest, level + 1, newDisc);
            }
            if (dungeonRandomizer.generateAndMutate() < 0.5) {
                createEnemy(newDisc.x + 50, newDisc.y, bat, level, newDisc);
                createEnemy(newDisc.x - 50, newDisc.y, bat, level, newDisc);
            }
            if (dungeonRandomizer.generateAndMutate() < 0.5) {
                createEnemy(newDisc.x, newDisc.y + 50, bat, level, newDisc);
                createEnemy(newDisc.x, newDisc.y - 50, bat, level, newDisc);
            }
            previousDisc = newDisc;
            discs.push(newDisc);
        }
        previousDisc.enemies = [];
        // Only one disc is allowed to spawn outside of the radius.
        if (bosses.length) {
            previousDisc.radius = 400;
            projectDiscToDisc(previousDisc, discs[discs.length - 2], dungeonRandomizer.range(32, 48));
            previousDisc.boss = createEnemy(previousDisc.x, previousDisc.y,
                bosses.pop()!, Math.min(100, level + 2), previousDisc);
            previousDisc.boss.isBoss = true;
        }
    }
    linkDiscs(discs);
    return {
        name,
        level,
        discs,
        entrance,
    };
}

export function activateDungeonPortal(state: GameState, portal: Portal): void {
    const dungeon = portal.dungeon;
    if (!dungeon) {
        return;
    }
    // Remove this portal when it is used.
    portal.disc.portals = portal.disc.portals.filter(p => p !== portal);
    startDungeon(state, dungeon);
}

export function startDungeon(state: GameState, dungeon: Dungeon): void {
    if (!dungeon) {
        return;
    }
    if (!state.dungeon){
        state.hero.overworldX = state.hero.x;
        state.hero.overworldY = state.hero.y;
    }
    // Remove this portal when it is used.
    state.dungeon = dungeon;
    state.hero.x = dungeon.entrance.x;
    state.hero.y = dungeon.entrance.y;
    state.activeDiscs = dungeon.discs;
    state.visibleDiscs = dungeon.discs;
    updateActiveCells(state);
    refillAllPotions(state);
    saveGame(state);
}



