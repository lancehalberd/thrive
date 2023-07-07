import { fillCircle } from 'app/render/renderGeometry';
import { updateSimpleBullet } from 'app/utils/bullet';
import { isEnemyPositionInvalid, moveEnemyInDirection, renderNormalizedEnemy, shootBulletArc, turnTowardsDirection, turnTowardsHeroHeading } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';

interface ScorpionParams {
    heading: number
}
export const scorpion: EnemyDefinition<ScorpionParams> = {
    name: 'Scorpion',
    statFactors: {speed: 0.5},
    initialParams: {heading: 0},
    radius: 24,
    update(state: GameState, enemy: Enemy<ScorpionParams>): void {
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
            turnTowardsDirection(state, enemy, enemy.params.heading);
            moveEnemyInDirection(state, enemy, enemy.params.heading, enemy.speed);
            if (enemy.modeTime >= 500 && isEnemyPositionInvalid(state, enemy)) {
                enemy.setMode('choose');
            }
        }
        if (enemy.mode === 'attack') {
            const aggroRadius = 300;
            const {distance2} = getTargetVector(enemy, state.hero);
            if (distance2 <= aggroRadius * aggroRadius) {
                if (enemy.modeTime <= 600) {
                    turnTowardsHeroHeading(state, enemy, 400, 0.2);
                }
                if (enemy.modeTime >= 1000 && enemy.attackCooldown <= state.fieldTime) {
                    enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                    const power = Math.min(1, enemy.level / 90);
                    const arcSize = 2 * Math.PI / 3 + Math.PI / 3 * power;
                    const bulletCount = Math.floor(3 + 3 * power);
                    const maxPoolSize = 40 + 40 * power;
                    // This slows down quickly, and doesn't damage until after 500ms.
                    shootBulletArc(state, enemy, enemy.theta, arcSize, bulletCount, 2 * window.BASE_ENEMY_BULLET_SPEED, {
                        warningTime: 500,
                        duration: 3000,
                        friction: 0.95,
                        damageOverTime: 0.5 * enemy.damage,
                        update: (state: GameState, bullet: Bullet) => {
                            updateSimpleBullet(state, bullet);
                            if (bullet.warningTime <= 0) {
                                bullet.vx = bullet.vy = 0;
                                bullet.radius = Math.min(bullet.radius * 1.1, maxPoolSize);
                            }
                        },
                    });
                }
            }
            if (enemy.modeTime >= 1500) {
                enemy.params.heading = enemy.theta;
                enemy.setMode('move');
            }
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => {
        fillCircle(context, {x: 0, y: 0, radius: 100}, 'black');
        fillCircle(context, {x: 10, y: 0, radius: 45}, enemy.baseColor);
        context.fillStyle = enemy.baseColor;
        // Top Claw
        context.beginPath();
        context.arc(40, -36, 35, Math.PI, 2 * Math.PI);
        context.fill();
        // Bottom Claw
        context.beginPath();
        context.arc(40, 36, 35, 0, Math.PI);
        context.fill();
        // Tail
        fillCircle(context, {x: -40, y: 0, radius: 15}, enemy.baseColor);
        fillCircle(context, {x: -60, y: -16, radius: 15}, enemy.baseColor);
        fillCircle(context, {x: -65, y: -37, radius: 15}, enemy.baseColor);
        // Stinger
        context.beginPath();
        context.arc(-45, -60, 20, 3 * Math.PI / 4, 7 * Math.PI / 4);
        context.fill();
    }),
};

