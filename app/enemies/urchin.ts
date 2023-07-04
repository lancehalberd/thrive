import { fillCircle } from 'app/render/renderGeometry';
import { shootBulletAtHero, shootBulletCircle } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';


export const urchin: EnemyDefinition = {
    name: 'Urchin',
    statFactors: {
        maxLife: 1.5,
        armor: 1.5,
        attacksPerSecond: 0.5,
    },
    initialParams: {},
    dropChance: 1.5 * window.BASE_DROP_CHANCE,
    uniqueMultiplier: 2,
    experienceFactor: 2,
    radius: 24,
    portalChance: 0.2,
    portalDungeonType: 'reef',
    update(state: GameState, enemy: Enemy): void {
        const aggroRadius = 600;
        const {distance2} = getTargetVector(enemy, state.hero);
        enemy.theta += 0.01;
        if (distance2 > aggroRadius * aggroRadius) {
            return;
        }
        if (enemy.modeTime % 200 === 0 && (enemy.modeTime % 2000) <= 1200) {
            shootBulletCircle(state, enemy, enemy.theta, 3, 0.6 * window.BASE_ENEMY_BULLET_SPEED, {duration: 2000});
        }
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootBulletAtHero(state, enemy, window.BASE_ENEMY_BULLET_SPEED);
        }
    },
    onDeath(state: GameState, enemy: Enemy): void {
        shootBulletCircle(state, enemy, enemy.theta, 12, 2 * window.BASE_ENEMY_BULLET_SPEED, {damage: enemy.damage * 2})
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

export const reefUrchin: EnemyDefinition = {
    ...urchin,
    portalChance: 0,
}
