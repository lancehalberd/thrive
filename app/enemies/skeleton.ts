import { fillCircle } from 'app/render/renderGeometry';
import { updateHeroSeekingBullet, updateSimpleBullet } from 'app/utils/bullet';
import { isEnemyPositionInvalid, moveEnemyInDirection, renderNormalizedEnemy, shootEnemyBullet, shootBulletAtHeroHeading, shootBulletCircle } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';

const boneBullet: Partial<Bullet> = {
    duration: 3000,
    update(state: GameState, bullet: Bullet) {
        if (bullet.time <= 600) {
            updateHeroSeekingBullet(state, bullet);
        } else {
            updateSimpleBullet(state, bullet);
        }
    }
};

interface SkeletonParams {
    heading: number
}
export const skeleton: EnemyDefinition<SkeletonParams> = {
    name: 'Skeleton',
    statFactors: {},
    initialParams: {heading: 0},
    radius: 24,
    update(state: GameState, enemy: Enemy<SkeletonParams>): void {
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
            const {x, y, distance2} = getTargetVector(enemy, state.hero);
            const aggroRadius = 500;
            if (distance2 <= aggroRadius ** 2 && enemy.attackCooldown <= state.fieldTime) {
                enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                const closeRadius = 300;
                if (distance2 < closeRadius * closeRadius) {
                    const theta = Math.atan2(y, x);
                    const speed = 0.8 * window.BASE_ENEMY_BULLET_SPEED;
                    shootEnemyBullet(state, enemy, speed * Math.cos(theta + 5 * Math.PI / 6), speed * Math.sin(theta + 5 * Math.PI / 6), boneBullet);
                    shootEnemyBullet(state, enemy, speed * Math.cos(theta - 5 * Math.PI / 6), speed * Math.sin(theta - 5 * Math.PI / 6), boneBullet);
                } else {
                    // This slows down quickly, and doesn't damage until after 500ms.
                    shootBulletAtHeroHeading(state, enemy, 2 * window.BASE_ENEMY_BULLET_SPEED, 0.2, {
                        warningTime: 1500,
                        duration: 1500,
                        friction: 0.8,
                        radius: 1.5 * window.BASE_ENEMY_BULLET_RADIUS,
                        onDeath(state: GameState, bullet: Bullet) {
                            shootBulletCircle(state, enemy, Math.random() * 2 * Math.PI, 6, 0.5 * window.BASE_ENEMY_BULLET_SPEED, {
                                baseX: bullet.x,
                                baseY: bullet.y,
                                x: bullet.x,
                                y: bullet.y,
                                duration: 3000,
                            });
                        },
                    });
                }
            }
            if (enemy.modeTime >= 1000) {
                if (Math.random() < 0.5) {
                    // 50% chance to choose a new direction.
                    enemy.setMode('choose');
                } else {
                    enemy.setMode('move');
                }
            }
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => {
        fillCircle(context, {x: 0, y: 0, radius: 100}, 'black');
        fillCircle(context, {x: 0, y: -25, radius: 70}, enemy.baseColor);
        fillCircle(context, {x: 0, y: 55, radius: 40}, enemy.baseColor);
        fillCircle(context, {x: -30, y: -10, radius: 20}, 'black');
        fillCircle(context, {x: 30, y: -10, radius: 20}, 'black');
        fillCircle(context, {x: 0, y: 20, radius: 10}, 'black');

        context.beginPath();
        context.lineWidth = 5;
        context.strokeStyle = 'black';
        context.arc(0, -25, 73, Math.PI / 3, 2 * Math.PI / 3);
        context.arc(0, -25, 87, 2 * Math.PI / 3,  Math.PI / 3, true);
        context.arc(0, -25, 100, Math.PI / 3, 2 * Math.PI / 3);
        for (let i = 0; i <= 3; i++) {
            const theta = Math.PI / 3 + (i + 1) * Math.PI / 3 / 5;
            context.moveTo(73 * Math.cos(theta), -25 + 73 * Math.sin(theta));
            context.lineTo(100 * Math.cos(theta), -25 + 100 * Math.sin(theta));
        }
        context.stroke();

    }),
};

