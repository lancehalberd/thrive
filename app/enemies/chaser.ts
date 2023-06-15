import { BASE_ENEMY_BULLET_SPEED,  FRAME_LENGTH } from 'app/constants';
import { fillCircle } from 'app/render/renderGeometry';
import { shootEnemyBullet } from 'app/utils/enemy';
import { getTargetVector, turnTowardsAngle } from 'app/utils/geometry';

export const chaser: EnemyDefinition = {
    name: 'Chaser',
    statFactors: {
        maxLife: 1,
        damage: 1,
        attacksPerSecond: 1,
    },
    initialParams: {},
    radius: 24,
    update(state: GameState, enemy: Enemy): void {
        if (!enemy.disc) {
            return;
        }
        const aggroRadius = 600;
        const {x, y, distance2} = getTargetVector(enemy, state.hero);
        if (distance2 > aggroRadius * aggroRadius) {
            return;
        }
        enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.atan2(y, x));
        enemy.x += enemy.speed * Math.cos(enemy.theta) * FRAME_LENGTH / 1000;
        enemy.y += enemy.speed * Math.sin(enemy.theta) * FRAME_LENGTH / 1000;

        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootEnemyBullet(state, enemy, BASE_ENEMY_BULLET_SPEED * Math.cos(enemy.theta), BASE_ENEMY_BULLET_SPEED * Math.sin(enemy.theta));
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, enemy.baseColor);
        fillCircle(context, {
            x: enemy.x + 15 * Math.cos(enemy.theta),
            y: enemy.y + 15 * Math.sin(enemy.theta),
            radius: 5,
        }, 'black');

    }
};
