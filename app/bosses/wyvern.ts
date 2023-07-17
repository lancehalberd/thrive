import { fillCircle } from 'app/render/renderGeometry';
import {
    createBombBullet, getBaseEnemyBullet, renderNormalizedEnemy,
} from 'app/utils/enemy';
// import { getTargetVector } from 'app/utils/geometry';
import Random from 'app/utils/Random';




export const wyvern: EnemyDefinition = {
    name: 'Wyvern',
    statFactors: {
        maxLife: window.BOSS_MAX_LIFE_FACTOR,
        damage: 1,
    },
    initialParams: {},
    dropChance: 1,
    uniqueMultiplier: 40,
    experienceFactor: 20,
    radius: 48,
    update(state: GameState, enemy: Enemy): void {
        if (enemy.mode === 'choose') {
            enemy.setMode(Random.element(['hail']));
        } else if (enemy.mode === 'hail') {
            const spacing = 150;
            const slots = (2 * enemy.disc.radius / spacing + 1) | 0;
            if (enemy.modeTime % 600 === 0) {
                for (let i = 0; i < slots; i++) {
                    //const slotIndex = (enemy.modeTime / 60) % slots;
                    const bullet = getBaseEnemyBullet(state, enemy);
                    const offset = 100;
                    bullet.baseY = bullet.y = enemy.disc.y - enemy.disc.radius - offset;
                    bullet.vx = 0;
                    const subX = (Math.random() * 3) | 0;
                    bullet.vy = window.BASE_ENEMY_BULLET_SPEED * Random.element([1 / 3, 0.5, 2 / 3]);
                    //const x = Math.floor((1 - 2 * Math.random()) * enemy.disc.radius / spacing) * spacing;
                    const x = -enemy.disc.radius + i * spacing;
                    bullet.baseX = bullet.x = enemy.disc.x + x + subX * spacing / 3;
                    bullet.duration = 1000 * (offset + 2 * enemy.disc.radius) / bullet.vy;
                    state.enemyBullets.push(bullet);
                }
            }
            if (enemy.modeTime % 2400 === 0) {
                const baseTheta = 2 * Math.PI * Math.random();
                const count = 2 + ((1 - enemy.life / enemy.maxLife) * 5) | 0;
                const size = 75 - 5 * count;
                for (let i = 0; i < count; i++) {
                    const theta = baseTheta + 2 * Math.PI * i / count;
                    for (let r = size; r <= enemy.disc.radius; r += 1.5* size) {
                        createBombBullet(state, enemy, enemy.disc.x + r * Math.cos(theta), enemy.disc.y + r * Math.sin(theta), {
                            warningTime: 1000,
                            duration: 1200,
                            radius: size,
                        });
                    }
                }
            }
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => {
        // Black circle
        fillCircle(context, {x: 0, y: 0, radius: 100}, 'black');
        fillCircle(context, {x: 0, y: 0, radius: 90}, enemy.baseColor);
        fillCircle(context, {x: 0, y: 0, radius: 80}, 'black');
        fillCircle(context, {x: 30, y: 0, radius: 40}, enemy.baseColor);
        fillCircle(context, {x: -15, y: 20, radius: 40}, enemy.baseColor);
        fillCircle(context, {x: -15, y: -20, radius: 40}, enemy.baseColor);
    }),

};
