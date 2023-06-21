import { FRAME_LENGTH } from 'app/constants';

export function updateCirclingBullet(state: GameState, bullet: Bullet): void {
    if (!bullet.source
        || typeof(bullet.theta) !== 'number'
        || typeof(bullet.vTheta) !== 'number'
        || typeof(bullet.orbitRadius) !== 'number'
    ) {
        return;
    }
    bullet.theta += FRAME_LENGTH * bullet.vTheta / 1000;
    bullet.x = bullet.source.x + bullet.orbitRadius * Math.cos(bullet.theta);
    bullet.y = bullet.source.y + bullet.orbitRadius * Math.sin(bullet.theta);
    if (bullet.friction) {
        const multiplier = (1 - bullet.friction) ** (FRAME_LENGTH / 1000);
        bullet.vTheta *= multiplier;
    }
}

export function updateSimpleBullet(state: GameState, bullet: Bullet): void {
    bullet.baseX += bullet.vx * FRAME_LENGTH / 1000;
    bullet.baseY += bullet.vy * FRAME_LENGTH / 1000;
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
        const multiplier = (1 - bullet.friction) ** (FRAME_LENGTH / 1000);
        bullet.vx *= multiplier;
        bullet.vy *= multiplier;
    }
}

export function updateReturnBullet(state: GameState, bullet: Bullet): void {
    updateSimpleBullet(state, bullet);
    // Reverse velocity at the bullet's half life.
    if (bullet.time >= bullet.duration / 2 && bullet.time < bullet.duration / 2 + 20) {
        bullet.vx = -bullet.vx;
        bullet.vy = -bullet.vy;
    }
}
