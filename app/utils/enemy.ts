import { BASE_ENEMY_BULLET_DURATION, BASE_ENEMY_BULLET_RADIUS, BASE_ENEMY_SPEED, BASE_WEAPON_DPS_PER_LEVEL, FRAME_LENGTH } from 'app/constants';
import { updateCirclingBullet, updateSimpleBullet } from 'app/utils/bullet';
import { findClosestDisc} from 'app/utils/disc';
import { getTargetVector, turnTowardsAngle } from 'app/utils/geometry';

export function createEnemy<EnemyParams>(state: GameState, x: number, y: number, definition: EnemyDefinition<EnemyParams>, level: number, disc: Disc, stats?: Partial<Enemy>): Enemy<EnemyParams> {
    const heroBaseWeaponDamage = level * BASE_WEAPON_DPS_PER_LEVEL;
    const heroLevelDamageFactor = Math.pow(1.05, level);
    const heroProficiencyDamageFactor = Math.pow(1.05, level);
    const heroDamage = Math.ceil(
        heroBaseWeaponDamage * heroLevelDamageFactor * heroProficiencyDamageFactor
    );
    // This includes attack speed gain from both level and weapon proficiency
    const heroAttacksPerSecond = 1 + 0.02 * level;
    const halfMediumArmorLifeBonus = (1 + level / 100 / 2);
    const heroMaxLife = 20 * (level + 1) * halfMediumArmorLifeBonus;
    const dps = heroAttacksPerSecond * heroDamage;
    const targetDuration = 1 + level * 10 / 100;
    const maxLife = Math.ceil((dps * targetDuration) * (definition.statFactors.maxLife ?? 1));
    const baseArmor = heroDamage / 20 * (definition.statFactors.armor ?? 1);


    const halfHeavyArmorBonus = (1 + level / 100 / 2);

    const enemy = {
        definition,
        disc,
        params: {...definition.initialParams},
        x,
        y,
        vx: 0,
        vy: 0,
        maxLife,
        life: maxLife,
        level,
        baseColor: getEnemyColor(level),
        speed: BASE_ENEMY_SPEED * (definition.statFactors.speed ?? 1) * (0.9 + 0.2 * Math.random()),
        baseArmor,
        armor: baseArmor,
        damage: Math.floor(
            (heroMaxLife / 10 + heroMaxLife / 10 * level / 100 + 1.5 * level * halfHeavyArmorBonus) * (definition.statFactors.damage ?? 1)
        ),
        attacksPerSecond: (1 + 0.03 * level) * (definition.statFactors.attacksPerSecond ?? 1),
        attackCooldown: 0,
        radius: definition.radius,
        theta: 0,
        minions: [],
        chargingLevel: 1,
        attackChargeLevel: 1,
        mode: 'choose',
        modeTime: 0,
        time: 0,
        isInvulnerable: definition.isInvulnerable,
        setMode(this: Enemy, mode: string): void {
            this.mode = mode;
            this.modeTime = 0;
        },
        ...stats,
    };
    if (disc) {
        disc.enemies.push(enemy);
        definition.initialize?.(state, enemy);
    }
    return enemy;
}

export function getEnemyColor(level: number): string {
    if (level === 1) {
        return 'lightBlue';
    }
    if (level <= 3) {
        return 'lightGreen';
    }
    if (level < 10) {
        return 'orange';
    }
    if (level < 20) {
        return '#262';
    }
    if (level < 30) {
        return 'purple';
    }
    if (level < 40) {
        return 'grey';
    }
    if (level < 50) {
        return 'green';
    }
    if (level < 60) {
        return '#FF0';
    }
    if (level < 70) {
        return '#F0F';
    }
    if (level < 80) {
        return '#0FF';
    }
    if (level < 90) {
        return 'silver';
    }
    return 'gold';
}


export function getBaseEnemyBullet(state: GameState, enemy: Enemy): Bullet {
    return  {
        time: 0,
        //x: enemy.x + vx / mag * enemy.radius,
        //y: enemy.y + vy / mag * enemy.radius,
        baseX: enemy.x,
        baseY: enemy.y,
        x: enemy.x,
        y: enemy.y,
        damage: enemy.damage,
        radius: BASE_ENEMY_BULLET_RADIUS,
        vx: 0,
        vy: 0,
        duration: BASE_ENEMY_BULLET_DURATION,
        update: updateSimpleBullet,
        hitTargets: new Set(),
        armorShred: 0.05,
        warningTime: 0,
    };
}

export function createBombBullet(state: GameState, enemy: Enemy, x: number, y: number, stats: Partial<Bullet> = {}) {
    const bullet: Bullet = {
        ...getBaseEnemyBullet(state, enemy),
        baseX: x,
        baseY: y,
        radius: 3 * BASE_ENEMY_BULLET_RADIUS,
        x, y,
        warningTime: 800,
        duration: BASE_ENEMY_BULLET_DURATION,
        ...stats,
    }
    //const mag = Math.sqrt(vx * vx + vy * vy);
    state.enemyBullets.push(bullet);
    return bullet;

}

export function shootEnemyBullet(state: GameState, enemy: Enemy, vx: number, vy: number, stats: Partial<Bullet> = {}) {
    const bullet: Bullet = {
        ...getBaseEnemyBullet(state, enemy),
        vx, vy,
        ...stats,
    }
    //const mag = Math.sqrt(vx * vx + vy * vy);
    state.enemyBullets.push(bullet);
    return bullet;
}

export function shootCirclingBullet(state: GameState, enemy: Enemy, theta: number, radius: number, stats: Partial<Bullet> = {}) {
    //const mag = Math.sqrt(vx * vx + vy * vy);
    state.enemyBullets.push({
        time: 0,
        //x: enemy.x + vx / mag * enemy.radius,
        //y: enemy.y + vy / mag * enemy.radius,
        baseX: enemy.x,
        baseY: enemy.y,
        x: enemy.x,
        y: enemy.y,
        source: enemy,
        damage: enemy.damage,
        radius: BASE_ENEMY_BULLET_RADIUS,
        vx: 0,
        vy: 0,
        orbitRadius: radius,
        theta,
        vTheta: 2 * Math.PI,
        duration: BASE_ENEMY_BULLET_DURATION,
        update: updateCirclingBullet,
        hitTargets: new Set(),
        // Armor shred is not functional against the player, although maybe it could be added
        // with player recovering armor over time.
        armorShred: 0.05,
        warningTime: 0,
        ...stats,
    });
}

export function shootBulletArc(state: GameState, enemy: Enemy, theta: number, angle: number, count: number, speed: number, stats: Partial<Bullet> = {}) {
    for (let i = 0; i < count; i++) {
        const bulletTheta = count > 1 ? (theta - angle / 2 + angle * i / (count - 1)) : theta;
        shootEnemyBullet(state, enemy, speed * Math.cos(bulletTheta), speed * Math.sin(bulletTheta), stats);
    }
}

export function shootBulletCircle(state: GameState, enemy: Enemy, theta: number, count: number, speed: number, stats: Partial<Bullet> = {}) {
    for (let i = 0; i < count; i++) {
        const bulletTheta = theta + 2 * Math.PI * i / count;
        shootEnemyBullet(state, enemy, speed * Math.cos(bulletTheta), speed * Math.sin(bulletTheta), stats);
    }
}

// This is used to check if the enemy hit a wall when trying to move somewhere.
export function isEnemyOffDisc(state: GameState, enemy: Enemy): boolean {
    if (getTargetVector(enemy, enemy.disc).distance2 >= enemy.disc.radius * enemy.disc.radius) {
        return true;
    }
    for (const hole of state.holes) {
        if (getTargetVector(enemy, hole).distance2 < hole.radius * hole.radius) {
            return true;
        }
    }
    return false;
}

// Indicates that the enemy is off the edge of the closest valid disc or inside a pit/wall.
export function isEnemyPositionInvalid(state: GameState, enemy: Enemy): boolean {
    const disc = enemy.disc.boss ? enemy.disc : findClosestDisc(enemy, state.activeDiscs);
    if (getTargetVector(enemy, disc).distance2 >= disc.radius * disc.radius) {
        return true;
    }
    for (const hole of state.holes) {
        if (getTargetVector(enemy, hole).distance2 < hole.radius * hole.radius) {
            return true;
        }
    }
    return false;
}

export function shootBulletAtHero(state: GameState, enemy: Enemy, speed: number, stats: Partial<Bullet> = {}) {
    const {x, y} = getTargetVector(enemy, state.hero);
    const theta = Math.atan2(y, x);
    shootEnemyBullet(state, enemy, speed * Math.cos(theta), speed * Math.sin(theta), stats);
}

export function shootBulletAtHeroHeading(state: GameState, enemy: Enemy, speed: number, leadTime: number, stats: Partial<Bullet> = {}) {
    const {x, y} = getTargetVector(enemy, {
        x: state.hero.x + state.hero.vx * leadTime / 1000,
        y: state.hero.y + state.hero.vy * leadTime / 1000,
    });
    const theta = Math.atan2(y, x);
    shootEnemyBullet(state, enemy, speed * Math.cos(theta), speed * Math.sin(theta), stats);
}


export function moveEnemyInCurrentDirection(state: GameState, enemy: Enemy, speed = enemy.speed): void {
    enemy.x += speed * Math.cos(enemy.theta) * FRAME_LENGTH / 1000;
    enemy.y += speed * Math.sin(enemy.theta) * FRAME_LENGTH / 1000;
}

export function moveEnemyInDirection(state: GameState, enemy: Enemy, theta: number = enemy.theta, speed = enemy.speed): void {
    enemy.x += speed * Math.cos(theta) * FRAME_LENGTH / 1000;
    enemy.y += speed * Math.sin(theta) * FRAME_LENGTH / 1000;
}

export function turnTowardsTarget(state: GameState, enemy: Enemy, target: Circle, turnSpeed = 0.2): void {
    const {x, y} = getTargetVector(enemy, target);
    enemy.theta = turnTowardsAngle(enemy.theta, turnSpeed, Math.atan2(y, x));
}

export function turnTowardsHeroHeading(state: GameState, enemy: Enemy, leadTime: number, turnSpeed = 0.2): void {
    const {x, y} = getTargetVector(enemy, {
        x: state.hero.x + state.hero.vx * leadTime / 1000,
        y: state.hero.y + state.hero.vy * leadTime / 1000,
    });
    enemy.theta = turnTowardsAngle(enemy.theta, turnSpeed, Math.atan2(y, x));
}

export function chaseTarget(state: GameState, enemy: Enemy, target: Circle, speed = enemy.speed): void {
    turnTowardsTarget(state, enemy, target);
    moveEnemyInDirection(state, enemy, enemy.theta, speed);
}
export function chaseHeroHeading(state: GameState, enemy: Enemy, leadTime = 500, speed = enemy.speed): void {
    turnTowardsHeroHeading(state, enemy, leadTime);
    moveEnemyInDirection(state, enemy, enemy.theta, speed);
}


export function moveEnemyToTarget(state: GameState, enemy: Enemy, {x, y}: Point, speed = enemy.speed): boolean {
    const dx = x - enemy.x, dy = y - enemy.y;
    enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.atan2(dy, dx));
    const distance = Math.sqrt(dx * dx + dy* dy);
    enemy.x += Math.min(speed * FRAME_LENGTH / 1000, distance) * Math.cos(enemy.theta);
    enemy.y += Math.min(speed * FRAME_LENGTH / 1000, distance) * Math.sin(enemy.theta);
    return distance <= speed * FRAME_LENGTH / 1000;
}

export function renderNormalizedEnemy(renderEnemy: RenderEnemy) {
    return (context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => {
        context.save();
            context.translate(enemy.x, enemy.y);
            context.rotate(enemy.theta);
            context.scale(enemy.radius / 100, enemy.radius / 100);
            renderEnemy(context, state, enemy);
        context.restore();
    };
}
