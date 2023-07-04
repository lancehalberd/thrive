import { getClosestElement, turnTowardsAngle } from 'app/utils/geometry';

export function updateCirclingBullet(state: GameState, bullet: Bullet): void {
    if (!bullet.source
        || typeof(bullet.theta) !== 'number'
        || typeof(bullet.vTheta) !== 'number'
        || typeof(bullet.orbitRadius) !== 'number'
    ) {
        return;
    }
    bullet.theta += window.FRAME_LENGTH * bullet.vTheta / 1000;
    bullet.baseX = bullet.source.x + bullet.orbitRadius * Math.cos(bullet.theta);
    bullet.baseY = bullet.source.y + bullet.orbitRadius * Math.sin(bullet.theta);
    if (bullet.frequency && bullet.amplitude) {
        const theta = bullet.theta;
        const p = Math.min(1, bullet.time / 200);
        const amplitude = p * bullet.amplitude * Math.sin(bullet.frequency * 2 * Math.PI * bullet.time / 1000);
        bullet.x = bullet.baseX + amplitude * Math.cos(theta);
        bullet.y = bullet.baseY + amplitude * Math.sin(theta);
    } else {
        bullet.x = bullet.baseX;
        bullet.y = bullet.baseY;
    }
    if (bullet.friction) {
        const multiplier = (1 - bullet.friction) ** (window.FRAME_LENGTH / 1000);
        bullet.vTheta = Math.max(0.2, bullet.vTheta * multiplier);
    }
}

export function updateSimpleBullet(state: GameState, bullet: Bullet): void {
    bullet.baseX += bullet.vx * window.FRAME_LENGTH / 1000;
    bullet.baseY += bullet.vy * window.FRAME_LENGTH / 1000;
    if (bullet.frequency && bullet.amplitude) {
        const theta = Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2;
        const p = Math.min(1, bullet.time / 200);
        const amplitude = p * bullet.amplitude * Math.sin(bullet.frequency * 2 * Math.PI * bullet.time / 1000);
        bullet.x = bullet.baseX + amplitude * Math.cos(theta);
        bullet.y = bullet.baseY + amplitude * Math.sin(theta);
    } else {
        bullet.x = bullet.baseX;
        bullet.y = bullet.baseY;
    }
    if (bullet.friction) {
        const multiplier = (1 - bullet.friction) ** (window.FRAME_LENGTH / 1000);
        bullet.vx *= multiplier;
        bullet.vy *= multiplier;
    }
}

export function updateReturnBullet(state: GameState, bullet: Bullet): void {
    updateSimpleBullet(state, bullet);
    // Reverse velocity at the bullet's half life.
    if (bullet.time >= bullet.duration / 2) {
        bullet.vx = -bullet.vx;
        bullet.vy = -bullet.vy;
        bullet.update = updateSimpleBullet;
    }
}

export function updateBoomeringBullet(state: GameState, bullet: Bullet): void {
    updateSimpleBullet(state, bullet);
    if (bullet.time >= bullet.duration / 2) {
        bullet.vx = -bullet.vx;
        bullet.vy = -bullet.vy;
        bullet.update = updateSourceSeekingBullet;
    }
}

function turnBulletTowardsTarget(bullet: Bullet, rate: number = 0.1, target?: Circle): void {
    if (!target) {
        return;
    }
    const dx = target.x - bullet.baseX, dy = target.y - bullet.baseY;
    const theta = turnTowardsAngle(Math.atan2(bullet.vy, bullet.vx), rate, Math.atan2(dy, dx));
    const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
    bullet.vx = speed * Math.cos(theta);
    bullet.vy = speed * Math.sin(theta);

}

export function isEnemyTargetable(state: GameState, enemy: Enemy): boolean {
    return !enemy.isInvulnerable && (!enemy.warningTime || enemy.warningTime <= 0);
}

export function updateEnemySeekingBullet(state: GameState, bullet: Bullet): void {
    const closestEnemy = getClosestElement(bullet, state.enemies.filter(e => !bullet.hitTargets.has(e) && isEnemyTargetable(state, e)));
    turnBulletTowardsTarget(bullet, 0.1, closestEnemy);
    updateSimpleBullet(state, bullet);
}

export function updateHeroSeekingBullet(state: GameState, bullet: Bullet): void {
    turnBulletTowardsTarget(bullet, 0.1, state.hero);
    updateSimpleBullet(state, bullet);
}

export function updateSourceSeekingBullet(state: GameState, bullet: Bullet): void {
    turnBulletTowardsTarget(bullet, 0.2, bullet.source);
    updateSimpleBullet(state, bullet);
}
