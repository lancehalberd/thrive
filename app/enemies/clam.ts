import { BASE_DROP_CHANCE, BASE_ENEMY_BULLET_RADIUS, BASE_ENEMY_BULLET_SPEED, BOSS_MAX_LIFE_FACTOR } from 'app/constants';
import { getPowerEnchantment } from 'app/enchantments';
import { fillCircle } from 'app/render/renderGeometry';
import { turnTowardsTarget, shootBulletArc, shootBulletAtHero, shootCirclingBullet } from 'app/utils/enemy';


export const clam: EnemyDefinition = {
    name: 'Clam',
    statFactors: {
        attacksPerSecond: 2,
        maxLife: 2,
        armor: 5,
    },
    initialParams: {},
    dropChance: 2 * BASE_DROP_CHANCE,
    uniqueMultiplier: 2,
    experienceFactor: 2,
    radius: 32,
    portalChance: 0.2,
    portalDungeonType: 'reef',
    update(state: GameState, enemy: Enemy): void {
        if (enemy.mode === 'closed' || enemy.mode === 'choose') {
            turnTowardsTarget(state, enemy, state.hero);
            enemy.mode = 'closed';
            enemy.armor = enemy.baseArmor * 10;
            return;
        } else {
            enemy.armor = enemy.baseArmor / 10;
        }

        turnTowardsTarget(state, enemy, state.hero, 0.1);
        if (enemy.mode === 'opening') {
            if (enemy.attackCooldown <= state.fieldTime) {
                enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                shootBulletAtHero(state, enemy, 1.2 * BASE_ENEMY_BULLET_SPEED, {radius: 1.5 * BASE_ENEMY_BULLET_RADIUS});
            }
            if (enemy.modeTime >= 400) {
                enemy.setMode('open');
            }
            return;
        }
        if (enemy.mode === 'closing') {
            if (enemy.modeTime >= 400) {
                enemy.setMode('closed');
            }
            return;
        }
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootBulletArc(state, enemy, enemy.theta, Math.PI, 7, BASE_ENEMY_BULLET_SPEED);
        }
        if (enemy.modeTime >= 2000) {
            enemy.setMode('closing');
        }
    },
    onDamage(state: GameState, enemy: Enemy): void {
        if (enemy.mode === 'closed' && enemy.modeTime >= 500) {
            enemy.setMode('opening');
        }
    },
    render: renderClam,
};


export const giantClam: EnemyDefinition = {
    ...clam,
    name: 'Giant Clam',
    statFactors: {
        attacksPerSecond: 1.5,
        maxLife: 0.75 * BOSS_MAX_LIFE_FACTOR,
        armor: 4,
    },
    dropChance: 1,
    uniqueMultiplier: 20,
    experienceFactor: 20,
    radius: 50,
    portalChance: 0,
    update(state: GameState, enemy: Enemy): void {
        // Constantly shoots small novas to hurt players that get too close.
        if (state.fieldTime % 200 === 0) {
            const healthPercentage = (enemy.maxLife - enemy.life) / enemy.maxLife;
            shootCirclingBullet(state, enemy, 0, enemy.radius + 5 * Math.floor(healthPercentage * 10));
            //const even = (state.fieldTime % 1000) === 0;
            //shootBulletCircle(state, enemy, even ? 0 : Math.PI / 20, 20, 40, {duration: 600});
        }
        if (enemy.mode === 'closed' || enemy.mode === 'choose') {
            turnTowardsTarget(state, enemy, state.hero);
            enemy.mode = 'closed';
            enemy.armor = enemy.baseArmor * 10;
            return;
        } else {
            enemy.armor = enemy.baseArmor / 10;
        }

        turnTowardsTarget(state, enemy, state.hero, 0.1);
        if (enemy.mode === 'opening') {
            if (enemy.attackCooldown <= state.fieldTime) {
                enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                shootBulletArc(state, enemy, enemy.theta, Math.PI / 3, 3, 1.2 * BASE_ENEMY_BULLET_SPEED, {radius: 1.5 * BASE_ENEMY_BULLET_RADIUS, damage: 1.5 * enemy.damage});
            }
            if (enemy.modeTime >= 400) {
                enemy.setMode('open');
            }
            return;
        }
        if (enemy.mode === 'closing') {
            if (enemy.modeTime >= 400) {
                enemy.setMode('closed');
            }
            return;
        }
        if (enemy.life <= enemy.maxLife / 2) {
            if (state.fieldTime % 200 === 0) {
                shootBulletAtHero(state, enemy, 1.2 * BASE_ENEMY_BULLET_SPEED, {radius: 1.5 * BASE_ENEMY_BULLET_RADIUS});
            }
        }
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootBulletArc(state, enemy, enemy.theta, Math.PI, 7, BASE_ENEMY_BULLET_SPEED, {duration: 2000});
        }
        if (enemy.modeTime >= 2000) {
            enemy.setMode('closing');
        }
    },
    getEnchantment(state: GameState, enemy: Enemy): Enchantment {
        return getPowerEnchantment(state, enemy.level);
    },
};

function renderClamArc(context: CanvasRenderingContext2D, r: number, p: number): void {
    context.beginPath();
    context.strokeStyle = 'black';
    context.moveTo(0, r);
    if (p === 0.5) {
        context.lineTo(0, -r);
        context.stroke();
        return;
    }
    let sign = 1;
    if (p > 0.5) {
        p = (p - 0.5) * 2;
    } else {
        p = (0.5 - p) * 2;
        sign = -1;
    }
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
        const y = r * Math.cos(Math.PI * i / steps); //r - 2 * r * i / steps;
        const x = Math.sqrt(r * r - y * y) * p * sign;
        context.lineTo(x, y);
    }
    context.stroke();
}

function renderClam(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
    fillCircle(context, enemy, 'black');
    fillCircle(context, {...enemy, radius: 5}, enemy.baseColor);

    context.save();
        context.translate(enemy.x, enemy.y);
        context.rotate(enemy.theta);
        context.fillStyle = enemy.baseColor;
        context.lineWidth = 1;
        context.strokeStyle = 'black';
        if (enemy.mode === 'opening' || enemy.mode === 'closing') {
            context.fillStyle = enemy.baseColor;
            context.beginPath();
            context.arc(0, 0, enemy.radius, Math.PI / 2,  3 * Math.PI / 2);
            if ((enemy.modeTime >= 200 && enemy.mode === 'closing') || (enemy.modeTime <= 200 && enemy.mode === 'opening')) {
                // 3/4 closed
                context.arc(-enemy.radius, 0, Math.sqrt(2) * enemy.radius, 5 * Math.PI / 3,  1 * Math.PI / 3, false);
                context.fill();
                for (let i = 1; i < 6; i++) {
                    renderClamArc(context, enemy.radius, 2 * i / 6 / 3);
                }
            } else {
                // 1/2 closed
                context.lineTo(0, -enemy.radius);
                context.fill();
                for (let i = 1; i < 6; i++) {
                    renderClamArc(context, enemy.radius, i / 6 / 2);
                }
            }
        } else if (enemy.mode === 'open') {
            context.fillStyle = enemy.baseColor;
            context.beginPath();
            context.arc(0, 0, enemy.radius, Math.PI / 2,  3 * Math.PI / 2);
            context.arc(enemy.radius, 0, Math.sqrt(2) * enemy.radius, 4 * Math.PI / 3,  2 * Math.PI / 3, true);
            context.fill();
            for (let i = 1; i < 6; i++) {
                renderClamArc(context, enemy.radius, i / 6 / 3);
            }
        } else {
            fillCircle(context, {...enemy, x: 0, y: 0}, enemy.baseColor);
            for (let i = 1; i < 6; i++) {
                renderClamArc(context, enemy.radius, i / 6);
            }
        }
        fillCircle(context, {x: 0, y: 0, radius: enemy.radius}, undefined, 'black');
    context.restore();
}
