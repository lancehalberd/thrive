import { fillCircle, parametricCurve } from 'app/render/renderGeometry';
import { updateSimpleBullet } from 'app/utils/bullet';
import { isEnemyPositionInvalid, moveEnemyInDirection, renderNormalizedEnemy, shootBulletAtHero, shootBulletAtHeroHeading } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';

interface SnakeParams {
    heading: number
}
export const snake: EnemyDefinition<SnakeParams> = {
    name: 'Snake',
    statFactors: {},
    initialParams: {heading: 0},
    radius: 24,
    update(state: GameState, enemy: Enemy<SnakeParams>): void {
        if (enemy.mode === 'choose') {
            const {x, y} = getTargetVector(enemy, enemy.disc);
            // Choose a heading that is generally towards the center of the current disc.
            enemy.params.heading = Math.atan2(y, x) + (0.5 - Math.random()) * Math.PI / 3;
            enemy.setMode('move');
        }
        if (enemy.mode === 'move') {
            if (enemy.modeTime >= 1000) {
                enemy.setMode('attack');
            }
            moveEnemyInDirection(state, enemy, enemy.params.heading, enemy.speed);
            if (enemy.modeTime >= 500 && isEnemyPositionInvalid(state, enemy)) {
                enemy.setMode('choose');
            }
        }
        if (enemy.mode === 'attack') {
            if (enemy.attackCooldown <= state.fieldTime) {
                enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                const closeRadius = 300;
                const {distance2} = getTargetVector(enemy, state.hero);
                if (distance2 > closeRadius * closeRadius) {
                    shootBulletAtHero(state, enemy, 1.5 * window.BASE_ENEMY_BULLET_SPEED, {amplitude: 20, frequency: 3});
                    shootBulletAtHero(state, enemy, 1.5 * window.BASE_ENEMY_BULLET_SPEED, {amplitude: -20, frequency: 3});
                } else {
                    // This slows down quickly, and doesn't damage until after 500ms.
                    shootBulletAtHeroHeading(state, enemy, 2 * window.BASE_ENEMY_BULLET_SPEED, 0.2, {
                        warningTime: 500,
                        duration: 2000,
                        friction: 0.95,
                        damageOverTime: enemy.damage,
                        update: (state: GameState, bullet: Bullet) => {
                            updateSimpleBullet(state, bullet);
                            if (bullet.warningTime <= 0) {
                                bullet.vx = bullet.vy = 0;
                                bullet.radius++;
                            }
                        },
                    });
                }
            }
            if (enemy.modeTime >= 1000) {
                enemy.setMode('move');
            }
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => {
        fillCircle(context, {x: 0, y: 0, radius: 100}, 'black');
        context.fillStyle = enemy.baseColor;
        // Top of mouth
        context.beginPath();
        context.arc(0, 0, 100, - Math.PI , 0);
        const topMouthCurve = (v: number) => {
            const theta = 0 * (1 - v) + (v) * - Math.PI;
            return {
                x: 100 * Math.cos(theta),
                y: (100 - 30 * Math.sin(v * Math.PI)) * Math.sin(theta),
            };
        }
        parametricCurve(context, [0, 1], 10, topMouthCurve);
        context.fill();

        // Teeth
        context.beginPath();
        context.moveTo(-80, -80);
        context.lineTo(-50, 30);
        context.lineTo(-20, -80);
        context.fill();
        context.beginPath();
        context.moveTo(80, -80);
        context.lineTo(50, 30);
        context.lineTo(20, -80);
        context.fill();

        // Top of mouth outline
        context.beginPath();
        context.lineWidth = 5;
        context.strokeStyle = 'black';
        parametricCurve(context, [0, 1], 10, topMouthCurve);
        context.stroke();
        // Bottom of mouth
        context.beginPath();
        context.arc(0, 0, 100, -2 * Math.PI, - Math.PI);
        const bottomMouthCurve = (v: number) => {
            const theta = - Math.PI * (1 - v) + v * -2 * Math.PI;
            return {
                x: 100 * Math.cos(theta),
                y: (100 - 30 * Math.sin(v * Math.PI)) * Math.sin(theta),
            };
        }
        parametricCurve(context, [0, 1], 10, bottomMouthCurve);
        context.fill();
    }),
};

