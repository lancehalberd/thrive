import { fillCircle } from 'app/render/renderGeometry';
import { shootEnemyBullet } from 'app/utils/enemy';
import { getTargetVector, turnTowardsAngle } from 'app/utils/geometry';


export const turret: EnemyDefinition = {
    name: 'Turret',
    statFactors: {
        maxLife: 2,
        damage: 1,
        attacksPerSecond: 1,
        armor: 2,
    },
    initialParams: {},
    dropChance: 2 * window.BASE_DROP_CHANCE,
    uniqueMultiplier: 2,
    experienceFactor: 2,
    radius: 24,
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
                shootEnemyBullet(state, enemy, window.BASE_ENEMY_BULLET_SPEED * Math.cos(theta), window.BASE_ENEMY_BULLET_SPEED * Math.sin(theta), {duration: 2000});
            }
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, enemy.baseColor);
        fillCircle(context, {
            x: enemy.x,
            y: enemy.y,
            radius: 20,
        }, 'black');
        fillCircle(context, {
            x: enemy.x,
            y: enemy.y,
            radius: 15,
        }, enemy.baseColor);
        fillCircle(context, {
            x: enemy.x + 20 * Math.cos(enemy.theta),
            y: enemy.y + 20 * Math.sin(enemy.theta),
            radius: 5,
        }, 'black');
    }
};
