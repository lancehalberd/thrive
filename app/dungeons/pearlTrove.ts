import { chest } from 'app/enemies/chest';
import { giantClam } from 'app/enemies/clam';

import { createDisc, linkDiscs, projectDiscToClosestDisc } from 'app/utils/disc';
import { createEnemy } from 'app/utils/enemy';
import { addOverworldPortalToDisc } from 'app/utils/overworld';
import SRandom from 'app/utils/SRandom';

const pearlTrove: Biome = {
    name: 'Pearl Trove',
    color: '#28F',
    centerColor: '#4CF',
    topEdgeColor: '#12D',
    bottomEdgeColor: '#00A',
}

export function createPearlTroveDungeon(state: GameState, seed: number, radius: number, level: number): Dungeon {
    const discs: Disc[] = [];
    const entrance: Entrance = {x: 0, y: 0, radius: 16};
    const dungeonRandomizer = SRandom.seed(seed);
    const startingPlatform: Disc = createDisc({
        level,
        ...pearlTrove,
        x: entrance.x,
        y: entrance.y,
        radius: 400,
    });
    addOverworldPortalToDisc(entrance, startingPlatform);
    discs.push(startingPlatform);
    for (let i = 0; i < 3; i++) {
        dungeonRandomizer.nextSeed();
        const theta = 2 * Math.PI * i / 3;
        const treasureDisc: Disc = createDisc({
            level,
            ...pearlTrove,
            x: radius * Math.cos(theta),
            y: radius * Math.sin(theta),
            radius: 300,
        });
        projectDiscToClosestDisc(discs, treasureDisc, 32);
        discs.push(treasureDisc);
        createEnemy(state, treasureDisc.x, treasureDisc.y, chest, level + 1, treasureDisc);

        const bossDisc: Disc = createDisc({
            level,
            ...pearlTrove,
            x: radius * Math.cos(theta),
            y: radius * Math.sin(theta),
            radius: 400,
        });
        projectDiscToClosestDisc(discs, bossDisc, 32);
        bossDisc.boss = createEnemy(state, bossDisc.x, bossDisc.y, giantClam, level + 2, bossDisc);
        bossDisc.boss.isBoss = true;
        discs.push(bossDisc);
    }
    linkDiscs(discs);
    return {
        name: pearlTrove.name,
        level,
        discs,
        entrance,
    };
}
