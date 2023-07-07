import { fillCircle } from 'app/render/renderGeometry';
import { moveEnemyInDirection, renderNormalizedEnemy, shootBulletAtHero, turnTowardsTarget } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';


export const sniper: EnemyDefinition = {
    name: 'Sniper',
    statFactors: {
        attacksPerSecond: 0.5,
        maxLife: 0.5,
        armor: 0.5,
        damage: 2,
        speed: 0.4,
    },
    initialParams: {},
    radius: 24,
    update(state: GameState, enemy: Enemy): void {
        const aggroRadius = 800;
        const {x, y, distance2} = getTargetVector(enemy, state.hero);
        if (distance2 > aggroRadius * aggroRadius) {
            return;
        }

        turnTowardsTarget(state, enemy, state.hero);
        const targetRadius = 600;
        // Try to stay a certain distance from the player.
        if (distance2 <= (targetRadius - 100) ** 2) {
            moveEnemyInDirection(state, enemy, Math.atan2(y, x) + Math.PI);
        } else if (distance2 >= (targetRadius + 100) ** 2){
            moveEnemyInDirection(state, enemy, Math.atan2(y, x));
        }

        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootBulletAtHero(state, enemy, 1.5 * window.BASE_ENEMY_BULLET_SPEED, {
                duration: 2000,
                radius: 1.2 * window.BASE_ENEMY_BULLET_RADIUS,
            });
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => {
        fillCircle(context, {x: 0, y: 0, radius: 100}, enemy.baseColor);
        context.fillStyle = 'black';
        // Tail
        context.beginPath();
        context.moveTo(100 * Math.cos(5 * Math.PI / 6), 100 * Math.sin(5 * Math.PI / 6));
        context.lineTo(100 * Math.cos(7 * Math.PI / 6), 100 * Math.sin(7 * Math.PI / 6));
        context.lineTo(-50, 0);
        context.fill();
        // Line
        context.lineWidth = 10;
        context.strokeStyle = 'black';
        context.beginPath();
        context.moveTo(-80, 0);
        context.lineTo(90, 0);
        context.stroke();
        // Head
        context.beginPath();
        context.moveTo(30, 50);
        context.lineTo(100, 0);
        context.lineTo(30, -50);
        context.lineTo(60, 0);
        context.fill();
    }),
};

