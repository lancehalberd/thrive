import { BASE_ENEMY_BULLET_RADIUS, BASE_ENEMY_SPEED } from 'app/constants';
import { fillCircle } from 'app/render/renderGeometry';
import { chaseTarget, moveEnemyInDirection, shootBulletArc, shootEnemyBullet } from 'app/utils/enemy';
import { getTargetVector, turnTowardsAngle } from 'app/utils/geometry';
import Random from 'app/utils/Random';

interface GuardianParams {
}
export const guardian: EnemyDefinition<GuardianParams> = {
    name: 'Guardian',
    statFactors: {
        maxLife: 5,
        damage: 1,
    },
    initialParams: {
    },
    dropChance: 1,
    experienceFactor: 20,
    radius: 40,
    update(state: GameState, enemy: Enemy): void {
        if (!enemy.disc) {
            return;
        }
        if (enemy.mode === 'choose') {
            enemy.speed = BASE_ENEMY_SPEED;
            chaseTarget(state, enemy, state.hero);
            if (enemy.modeTime >= 400) {
                enemy.setMode(Random.element(['moveToEdge', 'moveToEdge', 'chase']));
            }
            return;
        }
        if (enemy.mode === 'moveToEdge') {
            enemy.speed = 1.2 * BASE_ENEMY_SPEED;
            let {x, y, distance2} = getTargetVector(enemy.disc, enemy);
            if (distance2 >= (enemy.disc.radius * 0.8) ** 2) {
                enemy.setMode(Random.element(['shoot', 'shoot', 'circle']));
            } else {
                enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.atan2(y, x));
                moveEnemyInDirection(state, enemy);
            }
        }
        if (enemy.mode === 'shoot') {
            if (enemy.modeTime < 600) {
                const {x, y} = getTargetVector(enemy, state.hero);
                enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.atan2(y, x));
            }
            if (enemy.modeTime === 1000) {
                shootEnemyBullet(state, enemy,
                    300 * Math.cos(enemy.theta), 200 * Math.sin(enemy.theta),
                    {
                        expirationTime: state.fieldTime + 2000,
                        damage: enemy.damage * 5,
                        radius: 3 * BASE_ENEMY_BULLET_RADIUS,
                    }
                );
            }
            if (enemy.modeTime >= 1500) {
                enemy.setMode('charge');
            }
            return;
        }
        if (enemy.mode === 'charge') {
            enemy.speed = 1.5 * BASE_ENEMY_SPEED;
            moveEnemyInDirection(state, enemy);
            if (enemy.modeTime % 200 === 0) {
                const vx = 120 * Math.cos(enemy.theta + Math.PI / 2);
                const vy = 120 * Math.sin(enemy.theta + Math.PI / 2);
                shootEnemyBullet(state, enemy, vx, vy, {expirationTime: state.fieldTime + 3000});
                shootEnemyBullet(state, enemy, -vx, -vy, {expirationTime: state.fieldTime + 3000});
            }
            if (enemy.modeTime >= 3000) {
                enemy.setMode('choose');
            }
            // Stop earlier if it hits the outside of the ring.
            if (enemy.modeTime >= 1000) {
                let {distance2} = getTargetVector(enemy.disc, enemy);
                if (distance2 >= (enemy.disc.radius * 0.9) **2) {
                    enemy.setMode('choose');
                }
            }
            return;
        }
        if (enemy.mode === 'chase') {
            enemy.speed = BASE_ENEMY_SPEED;
            chaseTarget(state, enemy, state.hero);
            if (enemy.modeTime % 800 === 0) {
                shootBulletArc(state, enemy, enemy.theta, Math.PI / 6, 3, 200);
            }
            if (enemy.modeTime >= 4000) {
                enemy.setMode('choose');
            }
            return;
        }
        if (enemy.mode === 'circle') {
            enemy.speed = 2 * BASE_ENEMY_SPEED;
            let {x, y} = getTargetVector(enemy, enemy.disc);
            enemy.theta = Math.atan2(y, x);
            moveEnemyInDirection(state, enemy, enemy.theta + Math.PI / 2);
            if (enemy.modeTime % 600 === 0) {
                shootBulletArc(state, enemy, enemy.theta, Math.PI / 6, 3, 200);
            }
            if (enemy.modeTime >= 6000) {
                enemy.setMode('choose');
            }
            return;
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, 'orange');
        fillCircle(context, {
            x: enemy.x + 30 * Math.cos(enemy.theta + Math.PI / 6),
            y: enemy.y + 30 * Math.sin(enemy.theta + Math.PI / 6),
            radius: 5,
        }, 'black');
        fillCircle(context, {
            x: enemy.x + 30 * Math.cos(enemy.theta),
            y: enemy.y + 30 * Math.sin(enemy.theta),
            radius: 5,
        }, 'black');
        fillCircle(context, {
            x: enemy.x + 30 * Math.cos(enemy.theta - Math.PI / 6),
            y: enemy.y + 30 * Math.sin(enemy.theta - Math.PI / 6),
            radius: 5,
        }, 'black');
    }
};
