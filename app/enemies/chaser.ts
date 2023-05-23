import { FRAME_LENGTH } from 'app/constants';
import { fillCircle } from 'app/render/renderGame';
import { shootEnemyBullet } from 'app/utils/enemy';
import { getTargetVector, turnTowardsAngle } from 'app/utils/geometry';


export const chaser: EnemyDefinition = {
    statFactors: {
        maxLife: 1,
        damage: 1,
        attacksPerSecond: 1,
    },
    radius: 20,
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
        enemy.x += enemy.speed * Math.cos(enemy.theta) / FRAME_LENGTH;
        enemy.y += enemy.speed * Math.sin(enemy.theta) / FRAME_LENGTH;

        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootEnemyBullet(state, enemy, 100 * Math.cos(enemy.theta), 100 * Math.sin(enemy.theta), 1000);
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, 'orange');
        fillCircle(context, {
            x: enemy.x + 15 * Math.cos(enemy.theta),
            y: enemy.y + 15 * Math.sin(enemy.theta),
            radius: 5,
        }, 'black');

    }
};
