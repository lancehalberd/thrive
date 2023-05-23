import { FRAME_LENGTH } from 'app/constants';
import { fillCircle } from 'app/render/renderGame';
import { shootEnemyBullet } from 'app/utils/enemy';
import { getTargetVector, turnTowardsAngle } from 'app/utils/geometry';


export const circler: EnemyDefinition = {
    statFactors: {
        maxLife: 1,
        damage: 1,
        attacksPerSecond: 2,
    },
    radius: 20,
    update(state: GameState, enemy: Enemy): void {
        if (!enemy.disc) {
            return;
        }
        const aggroRadius = 200;
        const {x, y, distance2} = getTargetVector(enemy, state.hero);
        let targetTheta = enemy.theta;
        if (distance2 < aggroRadius * aggroRadius) {
            // Face the player, to shoot at them and circle them.
            targetTheta = Math.atan2(y, x);
            if (distance2 > 100 * 100) {
                targetTheta -= Math.PI / 12;
            }
        } else {
            // Face the disc to shoot around it and circle it.
            const {x, y, distance2} = getTargetVector(enemy, enemy.disc);
            targetTheta = Math.atan2(y, x);
            // Curve towards the center of the disc when too far out.
            if (distance2 > enemy.disc.radius * enemy.disc.radius / 4) {
                targetTheta -= Math.PI / 12;
            }
        }
        enemy.theta = turnTowardsAngle(enemy.theta, 0.2, targetTheta);
        // Note this enemy moves sideways.
        enemy.x += enemy.speed * Math.cos(enemy.theta + Math.PI / 2) / FRAME_LENGTH;
        enemy.y += enemy.speed * Math.sin(enemy.theta + Math.PI / 2) / FRAME_LENGTH;

        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootEnemyBullet(state, enemy, 100 * Math.cos(enemy.theta), 100 * Math.sin(enemy.theta), 1000);
            shootEnemyBullet(state, enemy, 100 * Math.cos(enemy.theta + Math.PI), 100 * Math.sin(enemy.theta + Math.PI), 1000);
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, 'orange');
        fillCircle(context, {
            x: enemy.x + 10 * Math.cos(enemy.theta),
            y: enemy.y + 10 * Math.sin(enemy.theta),
            radius: 5,
        }, 'black');
        fillCircle(context, {
            x: enemy.x + 10 * Math.cos(enemy.theta + Math.PI),
            y: enemy.y + 10 * Math.sin(enemy.theta + Math.PI),
            radius: 5,
        }, 'black');
    }
};
