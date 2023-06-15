import { BASE_DROP_CHANCE, BASE_ENEMY_BULLET_RADIUS, BASE_ENEMY_BULLET_SPEED } from 'app/constants';
import { fillCircle } from 'app/render/renderGeometry';
import { moveEnemyInCurrentDirection, shootBulletAtHero, shootBulletCircle } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';


export const urchin: EnemyDefinition = {
    name: 'Urchin',
    statFactors: {
        armor: 2,
        speed: 0.1,
    },
    initialParams: {},
    dropChance: 1.5 * BASE_DROP_CHANCE,
    experienceFactor: 2,
    radius: 24,
    portalChance: 0.2,
    portalDungeonType: 'reef',
    update(state: GameState, enemy: Enemy): void {
        const aggroRadius = 400;
        const {distance2} = getTargetVector(enemy, state.hero);
        enemy.theta += 0.02;
        moveEnemyInCurrentDirection(state, enemy);
        if (distance2 > aggroRadius * aggroRadius) {
            return;
        }
        if (enemy.modeTime % 100 === 0) {
            shootBulletCircle(state, enemy, enemy.theta, 3, BASE_ENEMY_BULLET_SPEED, {expirationTime: state.fieldTime + 1500});
        }
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootBulletAtHero(state, enemy, 1.2 * BASE_ENEMY_BULLET_SPEED, {radius: 1.5 * BASE_ENEMY_BULLET_RADIUS});
        }
    },
    onDeath(state: GameState, enemy: Enemy): void {
        shootBulletCircle(state, enemy, enemy.theta, 12, 2 * BASE_ENEMY_BULLET_SPEED, {damage: enemy.damage * 2})
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, enemy.baseColor);
        fillCircle(context, {
            x: enemy.x + 15 * Math.cos(enemy.theta),
            y: enemy.y + 15 * Math.sin(enemy.theta),
            radius: 5,
        }, 'black');
        fillCircle(context, {
            x: enemy.x + 15 * Math.cos(enemy.theta + 2 * Math.PI / 3),
            y: enemy.y + 15 * Math.sin(enemy.theta + 2 * Math.PI / 3),
            radius: 5,
        }, 'black');
        fillCircle(context, {
            x: enemy.x + 15 * Math.cos(enemy.theta - 2 * Math.PI / 3),
            y: enemy.y + 15 * Math.sin(enemy.theta - 2 * Math.PI / 3),
            radius: 5,
        }, 'black');
        context.strokeStyle = 'black';
        context.beginPath();
        context.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
            const theta = 2 * Math.PI * i / 12;
            const dx = Math.cos(theta), dy = Math.sin(theta);
            context.moveTo(enemy.x + 20 * dx, enemy.y + 20 * dy);
            context.lineTo(enemy.x + (26 + i % 2) * dx, enemy.y + (26 + i % 2) * dy);
        }
        context.stroke();
    }
};
