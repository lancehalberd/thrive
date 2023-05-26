import { BASE_DROP_CHANCE } from 'app/constants';
import { fillCircle } from 'app/render/renderGame';
import { shootEnemyBullet } from 'app/utils/enemy';
import { getTargetVector, turnTowardsAngle } from 'app/utils/geometry';


export const turret: EnemyDefinition = {
    name: 'Turret',
    statFactors: {
        maxLife: 2,
        damage: 1,
        attacksPerSecond: 1,
    },
    initialParams: {},
    dropChance: 2 * BASE_DROP_CHANCE,
    experienceFactor: 2,
    radius: 25,
    update(state: GameState, enemy: Enemy): void {
        const aggroRadius = 400;
        const {x, y, distance2} = getTargetVector(enemy, state.hero);
        if (distance2 > aggroRadius * aggroRadius) {
            enemy.theta += 0.01;
            return;
        }
        enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.atan2(y, x));
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            for (let i = 0; i < 3; i++) {
                const theta = enemy.theta - Math.PI / 6 + Math.PI / 6 * i;
                shootEnemyBullet(state, enemy, 100 * Math.cos(theta), 100 * Math.sin(theta), {expirationTime: state.fieldTime + 2000});
            }
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, 'orange');
        fillCircle(context, {
            x: enemy.x,
            y: enemy.y,
            radius: 20,
        }, 'black');
        fillCircle(context, {
            x: enemy.x,
            y: enemy.y,
            radius: 15,
        }, 'orange');
        fillCircle(context, {
            x: enemy.x + 20 * Math.cos(enemy.theta),
            y: enemy.y + 20 * Math.sin(enemy.theta),
            radius: 5,
        }, 'black');
    }
};
