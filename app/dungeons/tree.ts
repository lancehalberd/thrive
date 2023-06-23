import { guardian } from 'app/bosses/guardian';
import { babySpiderBomber, babySpiderNova } from 'app/bosses/spider';
import { chest } from 'app/enemies/chest';
import { ent } from 'app/enemies/ent';
import { lord } from 'app/enemies/lord';
import { snake } from 'app/enemies/snake';
import { sniper } from 'app/enemies/sniper';
import { turret } from 'app/enemies/turret';


import { createDisc, linkDiscs, projectDiscToClosestDisc } from 'app/utils/disc';
import { createEnemy } from 'app/utils/enemy';
import { addOverworldPortalToDisc } from 'app/utils/overworld';
import SRandom from 'app/utils/SRandom';

const treeBiome: Biome = {
    name: 'Tree',
    color: '#080',
    centerColor: '#0B4',
    topEdgeColor: '#640',
    bottomEdgeColor: '#320',
}

const platformSizes = [200, 350, 500];

export function createTreeDungeon(seed: number, radius: number, level: number): Dungeon {
    const name = 'Tree';
    const discs: Disc[] = [];
    const entrance: Entrance = {x: 0, y: 0, radius: 16};
    const dungeonRandomizer = SRandom.seed(seed);
    const startingPlatform: Disc = createDisc({
        level,
        ...treeBiome,
        x: entrance.x,
        y: entrance.y,
        radius: 600,
    });
    addOverworldPortalToDisc(entrance, startingPlatform);
    discs.push(startingPlatform);
    let finished = false;
    for (let i = 0; i < 100 && (!finished || i < 20); i++) {
        dungeonRandomizer.nextSeed();
        const theta = 2 * Math.PI * dungeonRandomizer.generateAndMutate();
        const newDisc: Disc = createDisc({
            level,
            ...treeBiome,
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
                newDisc.boss = createEnemy(newDisc.x, newDisc.y, guardian, level + 2, newDisc);
                newDisc.boss.isBoss = true;
                discs.push(newDisc);
            }
            continue;
        }
        discs.push(newDisc);
        if (newDisc.radius >= 300 && dungeonRandomizer.generateAndMutate() < 0.6) {
            createEnemy(newDisc.x, newDisc.y, ent, newDisc.level, newDisc);
        } else if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(newDisc.x, newDisc.y, turret, newDisc.level, newDisc);
        } else if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(newDisc.x, newDisc.y, lord, newDisc.level, newDisc);
        } else if (dungeonRandomizer.generateAndMutate() < 0.1) {
            createEnemy(newDisc.x, newDisc.y, chest, newDisc.level + 1, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(newDisc.x + 80, newDisc.y, babySpiderBomber, level, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(newDisc.x - 80, newDisc.y, snake, level, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(newDisc.x, newDisc.y + 80, sniper, level, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(newDisc.x, newDisc.y - 80, babySpiderNova, level, newDisc);
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
