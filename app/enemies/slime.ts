import { BASE_DROP_CHANCE, BASE_ENEMY_BULLET_RADIUS, BASE_ENEMY_BULLET_SPEED, BOSS_MAX_LIFE_FACTOR, FRAME_LENGTH } from 'app/constants';
import { getInsightEnchantment } from 'app/enchantments';
import { fillCircle } from 'app/render/renderGeometry';
import { createEnemy, shootBulletAtHero, shootBulletCircle } from 'app/utils/enemy';


export const slime: EnemyDefinition = {
    name: 'Slime',
    statFactors: {
        attacksPerSecond: 0.5,
        maxLife: 1.6,
        armor: 0,
    },
    initialParams: {},
    dropChance: BASE_DROP_CHANCE,
    experienceFactor: 2,
    radius: 24,
    portalChance: 0.1,
    portalDungeonType: 'cave',
    update(state: GameState, enemy: Enemy): void {
        updateSlimeMovement(state, enemy);
    },
    onDeath(state: GameState, enemy: Enemy): void {
        const count = Math.round(2 + Math.random());
        for (let i = 0; i < count; i++) {
            const theta = state.fieldTime / 500 + i * 2 * Math.PI / count;
            createEnemy(
                enemy.x + enemy.radius * Math.cos(theta),
                enemy.y + enemy.radius * Math.sin(theta), miniSlime, enemy.level, enemy.disc);
        }
    },
    onHit(state: GameState, enemy: Enemy): void {
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootBulletCircle(state, enemy, Math.random() * 2 * Math.PI, 12, 1.2 * BASE_ENEMY_BULLET_SPEED);
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, 'black');
        const count = Math.max(3, Math.ceil((enemy.radius - 8) / 8));
        for (let i = 0; i < count; i++) {
            const theta = state.fieldTime / 4000 + i * 2 * Math.PI / count;
            const p = (1 + Math.sin(state.fieldTime / 500 + i * 2 * Math.PI / 3)) / 2;
            const maxDistance = enemy.radius / 4;
            const minDistance = enemy.radius / 10;
            const distance = minDistance + p * (maxDistance - minDistance);
            fillCircle(context, {
                x: enemy.x + distance * Math.cos(theta),
                y: enemy.y + distance * Math.sin(theta),
                radius: 3 * enemy.radius / 4
            }, enemy.baseColor);
        }
    }
};

function updateSlimeMovement(state: GameState, enemy: Enemy) {
    if (enemy.mode === 'choose') {
        if (enemy.modeTime > 400) {
            enemy.theta = Math.random() * 2 * Math.PI;
            enemy.vx = 200 * Math.cos(enemy.theta);
            enemy.vy = 200 * Math.sin(enemy.theta);
            enemy.setMode('dash');
        }
    }
    if (enemy.mode === 'dash') {
        enemy.x += enemy.vx * FRAME_LENGTH / 1000;
        enemy.y += enemy.vy * FRAME_LENGTH / 1000;
        enemy.vx *= 0.97;
        enemy.vy *= 0.97;
        if (enemy.modeTime >= enemy.radius * 40) {
            enemy.setMode('choose');
        }
    }
}

export const greatSlime: EnemyDefinition = {
    ...slime,
    name: 'Great Slime',
    statFactors: {
        attacksPerSecond: 0.5,
        maxLife: 2.4,
        damage: 1.5,
        armor: 0,
    },
    initialParams: {},
    dropChance: 2 * BASE_DROP_CHANCE,
    portalChance: 0,
    experienceFactor: 2,
    radius: 32,
    onDeath(state: GameState, enemy: Enemy): void {
        const count = 2;
        for (let i = 0; i < count; i++) {
            const theta = state.fieldTime / 500 + i * 2 * Math.PI / count;
            createEnemy(
                enemy.x + enemy.radius * Math.cos(theta),
                enemy.y + enemy.radius * Math.sin(theta), slime, enemy.level, enemy.disc);
        }
    },
    onHit(state: GameState, enemy: Enemy): void {
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootBulletAtHero(state, enemy, 1.2 * BASE_ENEMY_BULLET_SPEED, {radius: 2 * BASE_ENEMY_BULLET_RADIUS});
            shootBulletCircle(state, enemy, Math.random() * 2 * Math.PI, 12, 1.2 * BASE_ENEMY_BULLET_SPEED);
        }
    },
};

export const megaSlime: EnemyDefinition = {
    ...slime,
    name: 'Mega Slime',
    statFactors: {
        attacksPerSecond: 0.5,
        maxLife: BOSS_MAX_LIFE_FACTOR,
        damage: 1.5,
        armor: 1,
    },
    initialParams: {},
    dropChance: 1,
    portalChance: 0,
    experienceFactor: 5,
    radius: 40,
    getEnchantment(state: GameState, enemy: Enemy) {
        return getInsightEnchantment(state, enemy.level);
    },
    update(state: GameState, enemy: Enemy): void {
        updateSlimeMovement(state, enemy);
        if (enemy.mode === 'dash' && enemy.modeTime === 0) {
            shootBulletAtHero(state, enemy, 1.5 * BASE_ENEMY_BULLET_SPEED, {damage: 1.5 * enemy.damage, radius: 2 * BASE_ENEMY_BULLET_RADIUS});
        }
        if (enemy.mode === 'choose' && enemy.modeTime === 0) {
            shootBulletCircle(state, enemy, Math.random() * 2 * Math.PI, 12, 1.2 * BASE_ENEMY_BULLET_SPEED, {expirationTime: state.fieldTime + 2000});
        }
    },
    onDeath(state: GameState, enemy: Enemy): void {
        const count = 2;
        for (let i = 0; i < count; i++) {
            const theta = state.fieldTime / 500 + i * 2 * Math.PI / count;
            createEnemy(
                enemy.x + enemy.radius * Math.cos(theta),
                enemy.y + enemy.radius * Math.sin(theta), greatSlime, enemy.level, enemy.disc);
        }
    },
    onHit(state: GameState, enemy: Enemy): void {
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            for (let i = 0; i < 4; i++) {
                const speed = 0.3 * BASE_ENEMY_BULLET_SPEED + i * 0.3 * BASE_ENEMY_BULLET_SPEED;
                shootBulletCircle(state, enemy, Math.random() * 2 * Math.PI, 10, speed, {expirationTime: state.fieldTime + 2000});
            }
        }
    },
};

export const miniSlime: EnemyDefinition = {
    ...slime,
    name: 'Mini Slime',
    statFactors: {
        maxLife: 0.8,
        armor: 0,
    },
    initialParams: {},
    portalChance: 0,
    dropChance: 0,
    experienceFactor: 0.1,
    radius: 16,
    onDeath(state: GameState, enemy: Enemy): void {
        shootBulletCircle(state, enemy, 0, 6, BASE_ENEMY_BULLET_SPEED);
    },
    onHit(state: GameState, enemy: Enemy): void {
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootBulletAtHero(state, enemy, BASE_ENEMY_BULLET_SPEED);
        }
    },
};
