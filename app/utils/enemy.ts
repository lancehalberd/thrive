import { BASE_ENEMY_BULLET_DURATION, BASE_ENEMY_BULLET_RADIUS, BASE_ENEMY_SPEED, FRAME_LENGTH } from 'app/constants';
import { getTargetVector, turnTowardsAngle } from 'app/utils/geometry';
import { updateSimpleBullet } from 'app/weapons';

export function createEnemy<EnemyParams>(x: number, y: number, definition: EnemyDefinition<EnemyParams>, level: number): Enemy<EnemyParams> {
    const heroDamage = Math.ceil(level * 20 * Math.pow(1.05, level));
    const heroAttacksPerSecond = 2 + 0.02 * level;
    const heroMaxLife = 20 * (level + 1);
    const dps = heroAttacksPerSecond * heroDamage;
    const targetDuration = 2 + level * 8 / 100;
    const maxLife = Math.ceil((dps * targetDuration) * (definition.statFactors.maxLife ?? 1));
    const baseArmor = 2 * level * (definition.statFactors.armor ?? 1);
    return {
        definition,
        params: {...definition.initialParams},
        x,
        y,
        maxLife,
        life: maxLife,
        level,
        speed: BASE_ENEMY_SPEED * (definition.statFactors.speed ?? 1) * (0.9 + 0.2 * Math.random()),
        baseArmor,
        armor: baseArmor,
        damage: Math.floor(
            (heroMaxLife / 10 + heroMaxLife / 10 * level / 100 + level) * (definition.statFactors.damage ?? 1)
        ),
        attacksPerSecond: (1 + 0.05 * level) * (definition.statFactors.attacksPerSecond ?? 1),
        attackCooldown: 0,
        radius: definition.radius,
        theta: 0,
        minions: [],
        chargingLevel: 1,
        attackChargeLevel: 1,
        mode: 'choose',
        modeTime: 0,
        isInvulnerable: definition.isInvulnerable,
        setMode(this: Enemy, mode: string): void {
            this.mode = mode;
            this.modeTime = 0;
        }
    };
}

export function shootEnemyBullet(state: GameState, enemy: Enemy, vx: number, vy: number, stats: Partial<Bullet> = {}) {
    //const mag = Math.sqrt(vx * vx + vy * vy);
    state.enemyBullets.push({
        //x: enemy.x + vx / mag * enemy.radius,
        //y: enemy.y + vy / mag * enemy.radius,
        x: enemy.x,
        y: enemy.y,
        damage: enemy.damage,
        radius: BASE_ENEMY_BULLET_RADIUS,
        vx,
        vy,
        expirationTime: state.fieldTime + BASE_ENEMY_BULLET_DURATION,
        update: updateSimpleBullet,
        hitTargets: new Set(),
        // Armor shred is not functional against the player, although maybe it could be added
        // with player recovering armor over time.
        armorShred: 0,
        ...stats,
    });
}

export function shootBulletArc(state: GameState, enemy: Enemy, theta: number, angle: number, count: number, speed: number, stats: Partial<Bullet> = {}) {
    for (let i = 0; i < count; i++) {
        const bulletTheta = count > 1 ? (theta - angle / 2 + angle * i / (count - 1)) : theta;
        shootEnemyBullet(state, enemy, speed * Math.cos(bulletTheta), speed * Math.sin(bulletTheta), stats);
    }
}

export function moveEnemyInCurrentDirection(state: GameState, enemy: Enemy): void {
    enemy.x += enemy.speed * Math.cos(enemy.theta) / FRAME_LENGTH;
    enemy.y += enemy.speed * Math.sin(enemy.theta) / FRAME_LENGTH;
}

export function moveEnemyInDirection(state: GameState, enemy: Enemy, theta: number = enemy.theta): void {
    enemy.x += enemy.speed * Math.cos(theta) / FRAME_LENGTH;
    enemy.y += enemy.speed * Math.sin(theta) / FRAME_LENGTH;
}

export function chaseTarget(state: GameState, enemy: Enemy, target: Circle): void {
    const {x, y} = getTargetVector(enemy, target);
    enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.atan2(y, x));
    moveEnemyInDirection(state, enemy);
}


export function moveEnemyToTarget(state: GameState, enemy: Enemy, {x, y}: Point): boolean {
    const dx = x - enemy.x, dy = y - enemy.y;
    enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.atan2(dy, dx));
    const distance = Math.sqrt(dx * dx + dy* dy);
    enemy.x += Math.min(enemy.speed / FRAME_LENGTH, distance) * Math.cos(enemy.theta);
    enemy.y += Math.min(enemy.speed / FRAME_LENGTH, distance) * Math.sin(enemy.theta);
    return distance <= enemy.speed / FRAME_LENGTH;
}

