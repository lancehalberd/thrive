import { chest } from 'app/enemies/chest';
import { clam, giantClam } from 'app/enemies/clam';
import { crab } from 'app/enemies/crab';
import { squid} from 'app/enemies/squid';
import { reefUrchin } from 'app/enemies/urchin';


import { createDisc, linkDiscs, projectDiscToClosestDisc } from 'app/utils/disc';
import { createEnemy } from 'app/utils/enemy';
import { addOverworldPortalToDisc } from 'app/utils/overworld';
import SRandom from 'app/utils/SRandom';

const platformSizes = [200, 350, 500];
const reefBiome: Biome = {
    name: 'Reef',
    color: '#28F',
    centerColor: '#4CF',
    topEdgeColor: '#12D',
    bottomEdgeColor: '#00A',
}

export function createReefDungeon(state: GameState, seed: number, radius: number, level: number): Dungeon {
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
                newDisc.boss = createEnemy(state, newDisc.x, newDisc.y, giantClam, level + 2, newDisc);
                newDisc.boss.isBoss = true;
                discs.push(newDisc);
            }
            continue;
        }
        discs.push(newDisc);
        // TODO: Add different enemy generators and apply them at random.
        if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(state, newDisc.x, newDisc.y, reefUrchin, level, newDisc);
        } else if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(state, newDisc.x, newDisc.y, clam, level, newDisc);
        } else if (dungeonRandomizer.generateAndMutate() < 0.3) {
            createEnemy(state, newDisc.x, newDisc.y, chest, level + 1, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            createEnemy(state, newDisc.x + 50, newDisc.y, crab, level, newDisc);
            createEnemy(state, newDisc.x - 50, newDisc.y, crab, level, newDisc);
        }
        if (dungeonRandomizer.generateAndMutate() < 0.5) {
            createEnemy(state, newDisc.x, newDisc.y + 50, squid, level, newDisc);
            createEnemy(state, newDisc.x, newDisc.y - 50, squid, level, newDisc);
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
