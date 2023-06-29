import { guardian } from 'app/bosses/guardian';
import { skissue } from 'app/bosses/skissue';
import { spider } from 'app/bosses/spider';
import { bat } from 'app/enemies/bat';
import { chest } from 'app/enemies/chest';
import { giantClam } from 'app/enemies/clam';
import { greatSlime, megaSlime } from 'app/enemies/slime';
import { saveGame } from 'app/saveGame';
import { createDisc, linkDiscs, projectDiscToClosestDisc, projectDiscToDisc } from 'app/utils/disc';
import { createEnemy } from 'app/utils/enemy';
import { refillAllPotions } from 'app/utils/hero';
import { addOverworldPortalToDisc, updateActiveCells } from 'app/utils/overworld';
import SRandom from 'app/utils/SRandom';
import { createPearlTroveDungeon } from 'app/dungeons/pearlTrove';
import { createReefDungeon } from 'app/dungeons/reef';
import { createSpiderDenDungeon } from 'app/dungeons/spiderDen';
import { createTreeDungeon } from 'app/dungeons/tree';

const platformSizes = [200, 350, 500];

export const dungeonTypes: DungeonType[] = ['reef', 'pearlTrove', 'cave', 'tree', 'arena', 'spiderDen'];


export function addDungeonPortalToDisc(state: GameState, {x, y}: Point, type: DungeonType, level: number, seed = Math.random(), disc: Disc): Portal {
    const dungeon = createDungeon(state, type, level, seed);
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
    if (type === 'pearlTrove') return 1;
    if (type === 'cave') return 1;
    if (type === 'tree') return 1;
    if (type === 'arena') return 1;
    if (type === 'spiderDen') return 1;
    return 2;
}

export function createDungeon(state: GameState, type: DungeonType, level: number, seed = Math.random()) {
    const radius = 1600 + 8 * level;
    level = Math.max(0, level + getDungeonLevelBonus(type));
    if (type === 'reef') return createReefDungeon(state, seed, radius, level);
    if (type === 'pearlTrove') return createPearlTroveDungeon(state, seed, radius, level);
    if (type === 'cave') return createCaveDungeon(state, seed, radius, level);
    if (type === 'arena') return createArenaDungeon(state, seed, radius, level);
    if (type === 'spiderDen') return createSpiderDenDungeon(state, seed, level);
    return createTreeDungeon(state, seed, radius, level);
}

export function createCaveDungeon(state: GameState, seed: number, radius: number, level: number): Dungeon {
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
                newDisc.boss = createEnemy(state, newDisc.x, newDisc.y, megaSlime, level + 2, newDisc);
                newDisc.boss.isBoss = true;
                discs.push(newDisc);
            }
            continue;
        }
        discs.push(newDisc);
        // TODO: Add different enemy generators and apply them at random.
        if (dungeonRandomizer.generateAndMutate() < 0.2) {
            createEnemy(state, newDisc.x, newDisc.y, greatSlime, level, newDisc);
        } else if (dungeonRandomizer.generateAndMutate() < 0.2) {
            createEnemy(state, newDisc.x, newDisc.y, chest, level + 1, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            createEnemy(state, newDisc.x + 50, newDisc.y, bat, level, newDisc);
            createEnemy(state, newDisc.x - 50, newDisc.y, bat, level, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            createEnemy(state, newDisc.x, newDisc.y + 50, bat, level, newDisc);
            createEnemy(state, newDisc.x, newDisc.y - 50, bat, level, newDisc);
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


export function createArenaDungeon(state: GameState, seed: number, radius: number, level: number): Dungeon {
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
                createEnemy(state, newDisc.x, newDisc.y, greatSlime, level, newDisc);
            } else if (dungeonRandomizer.generateAndMutate() < 0.2) {
                createEnemy(state, newDisc.x, newDisc.y, chest, level + 1, newDisc);
            }
            if (dungeonRandomizer.generateAndMutate() < 0.5) {
                createEnemy(state, newDisc.x + 50, newDisc.y, bat, level, newDisc);
                createEnemy(state, newDisc.x - 50, newDisc.y, bat, level, newDisc);
            }
            if (dungeonRandomizer.generateAndMutate() < 0.5) {
                createEnemy(state, newDisc.x, newDisc.y + 50, bat, level, newDisc);
                createEnemy(state, newDisc.x, newDisc.y - 50, bat, level, newDisc);
            }
            previousDisc = newDisc;
            discs.push(newDisc);
        }
        previousDisc.enemies = [];
        // Only one disc is allowed to spawn outside of the radius.
        if (bosses.length) {
            previousDisc.radius = 400;
            projectDiscToDisc(previousDisc, discs[discs.length - 2], dungeonRandomizer.range(32, 48));
            previousDisc.boss = createEnemy(state, previousDisc.x, previousDisc.y,
                bosses.pop()!, level + 2, previousDisc);
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
