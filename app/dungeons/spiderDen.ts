import { babySpiderBomber, babySpiderNova, spider, spiderFlower, spiderPinwheel } from 'app/bosses/spider';
import { chest } from 'app/enemies/chest';


import { createDisc, linkDiscs, projectDiscToDisc } from 'app/utils/disc';
import { createEnemy } from 'app/utils/enemy';
import { doCirclesIntersect } from 'app/utils/geometry';
import { addOverworldPortalToDisc } from 'app/utils/overworld';
import SRandom from 'app/utils/SRandom';


function generateConnectingDiscs(source: Disc, target: Disc, randomizer: typeof SRandom, sizes: number[]): Disc[] {
    const discs: Disc[] = []
    let safety = 100;
    while (!doCirclesIntersect({...source, radius: source.radius - 16}, {...target, radius: target.radius - 16}) && safety-- > 0) {
        const newDisc = createDisc({
            level: target.level,
            name: target.name,
            color: target.color,
            centerColor: target.centerColor,
            topEdgeColor: target.topEdgeColor,
            bottomEdgeColor: target.bottomEdgeColor,
            x: target.x,
            y: target.y,
            enemies: [],
            radius: randomizer.element(sizes),
        });
        newDisc.x += 128 * (0.5 - Math.random());
        newDisc.y += 128 * (0.5 - Math.random());
        projectDiscToDisc(newDisc, source, randomizer.range(32,48));
        randomizer.generateAndMutate();
        discs.push(newDisc);
        source = newDisc;
    }
    return discs;
}

function createBridge(state: GameState, discs: Disc[], source: Disc, target: Disc, randomizer: typeof SRandom): void {
    const bridgeDiscs = generateConnectingDiscs(source, target, randomizer, smallPlatformSizes);
    for (const disc of bridgeDiscs) {
        disc.holes.push({x: disc.x, y: disc.y, radius: disc.radius / 2});
        if (randomizer.generateAndMutate() < 0.05) {
            createEnemy(state, disc.x, disc.y, chest, disc.level + 1, disc);
        }
        if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y - 60, babySpiderBomber, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x, disc.y + 60, babySpiderBomber, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x - 60, disc.y, babySpiderNova, disc.level, disc);
        }
        if (randomizer.generateAndMutate() < 0.2) {
            createEnemy(state, disc.x + 60, disc.y, babySpiderNova, disc.level, disc);
        }
        discs.push(disc);
    }
}


const spiderDenBiome: Biome = {
    name: 'Spider Den',
    color: '#EEE',
    centerColor: '#888',
    topEdgeColor: '#888',
    bottomEdgeColor: '#444',
}

const smallPlatformSizes = [150, 200, 250];
export function createSpiderDenDungeon(state: GameState, seed: number, level: number): Dungeon {
    const dungeonRandomizer = SRandom.seed(seed);
    const radius = 1600 + 10 * level;
    const name = 'Spider Den';
    const discs: Disc[] = [];
    const entranceTheta = 2 * Math.PI * dungeonRandomizer.generateAndMutate();
    const entrance: Entrance = {
        x: radius * Math.cos(entranceTheta),
        y: radius * Math.sin(entranceTheta),
        radius: 16,
    };
    const startingPlatform: Disc = createDisc({
        level,
        ...spiderDenBiome,
        x: entrance.x,
        y: entrance.y,
        radius: 600,
    });
    addOverworldPortalToDisc(entrance, startingPlatform);
    discs.push(startingPlatform);
    let previousPlatform = startingPlatform;
    const largePlatforms: Disc[] = [];
    for (let i = 1; i < 5; i++) {
        const theta = entranceTheta + i * 2 * Math.PI / 5;
        const largePlatform = createDisc({
            level,
            ...spiderDenBiome,
            x: radius * Math.cos(theta),
            y: radius * Math.sin(theta),
            radius: 350,
        });
        createEnemy(state, largePlatform.x, largePlatform.y, (i % 2) ? spiderPinwheel : spiderFlower, largePlatform.level + 1, largePlatform);
        createBridge(state, discs, largePlatform, previousPlatform, dungeonRandomizer);
        discs.push(largePlatform);
        largePlatforms.push(largePlatform);
        previousPlatform = largePlatform;
    }
    // Complete the circle
    createBridge(state, discs, previousPlatform, startingPlatform, dungeonRandomizer);
    const bossPlatform = createDisc({
        level,
        ...spiderDenBiome,
        x: 0,
        y: 0,
        radius: 400,
    });
    // Join all platforms but the starting platform to the boss platform
    for (const largePlatform of largePlatforms) {
        createBridge(state, discs, bossPlatform, largePlatform, dungeonRandomizer);
    }

    bossPlatform.boss = createEnemy(state, bossPlatform.x, bossPlatform.y,
        spider, Math.min(100, level + 2), bossPlatform);
    bossPlatform.boss.isBoss = true;
    discs.push(bossPlatform);

    linkDiscs(discs);
    return {
        name,
        level,
        discs,
        entrance,
    };
}
