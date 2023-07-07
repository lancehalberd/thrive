import { drawOval, fillCircle } from 'app/render/renderGeometry';
import { updateCirclingBullet, updateSimpleBullet } from 'app/utils/bullet';
import { isEnemyPositionInvalid, moveEnemyInDirection, renderNormalizedEnemy, shootBulletAtHero, shootCirclingBullet } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';

function updateSpiralBullet(state: GameState, bullet: Bullet<Enemy>) {
    bullet.orbitRadius = Math.min(100, (bullet.orbitRadius || 0) + 1);
    updateCirclingBullet(state, bullet);
}

const cycloneBullet: Partial<Bullet<Enemy>> = {
    warningTime: 3000,
    duration: 3000,
    radius: 0.5 * window.BASE_ENEMY_BULLET_RADIUS,
    friction: 0.25,
    update(state: GameState, bullet: Bullet<Enemy>) {
        updateSimpleBullet(state, bullet);
        const spiralDuration = 1500;
        if (bullet.time % 100 === 0 /*&& bullet.time < bullet.duration - spiralDuration*/) {
            const parity = bullet.time % 200 === 100;
            const theta = Math.PI * bullet.time / 600 + (parity ? Math.PI : 0);
            shootCirclingBullet(state, bullet.source, theta, 0, {
                anchor: bullet,
                duration: spiralDuration,
                orbitRadius: 5,
                radius: 0.8 * window.BASE_ENEMY_BULLET_RADIUS,
                vTheta: 3 * Math.PI,
                update: updateSpiralBullet,
            });
        }
    }
}

interface TornadoParams {
    heading: number
}
export const tornado: EnemyDefinition<TornadoParams> = {
    name: 'Tornado',
    statFactors: {
        attacksPerSecond: 0.5,
        damage: 0.8,
        speed: 0.8,
    },
    initialParams: {heading: 0},
    radius: 24,
    update(state: GameState, enemy: Enemy<TornadoParams>): void {
        // Circle around the middle third of the disc.
        const {x, y, distance2} = getTargetVector(enemy, enemy.disc);
        const discTheta = Math.atan2(y, x);
        if (distance2 > (0.66 * enemy.disc.radius) ** 2) {
            moveEnemyInDirection(state, enemy, discTheta +  Math.PI / 3);
        } else if (distance2 < (0.33 * enemy.disc.radius) ** 2) {
            moveEnemyInDirection(state, enemy, discTheta + 2 * Math.PI / 3);
        } else {
            moveEnemyInDirection(state, enemy, discTheta + Math.PI / 2);
        }
        const aggroRadius = 500;
        const heroDistance2 = getTargetVector(enemy, state.hero).distance2;
        if (heroDistance2 <= aggroRadius * aggroRadius) {
            if (enemy.modeTime >= 1000 && enemy.attackCooldown <= state.fieldTime) {
                enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                // const power = Math.min(1, enemy.level / 90);
                shootBulletAtHero(state, enemy, 1.5 * window.BASE_ENEMY_BULLET_SPEED, cycloneBullet);
            }
        }
        if (heroDistance2 <= 800 * 800) {
            if (enemy.modeTime % 200 === 0) {
                const parity = enemy.modeTime % 400 === 200;
                const theta = Math.PI * enemy.modeTime / 600 + (parity ? Math.PI : 0);
                shootCirclingBullet(state, enemy, theta, 0, {
                    duration: 2000,
                    orbitRadius: 5,
                    radius: 0.8 * window.BASE_ENEMY_BULLET_RADIUS,
                    vTheta: 3 * Math.PI,
                    update(state: GameState, bullet: Bullet<Enemy>) {
                        bullet.orbitRadius = Math.min(60, (bullet.orbitRadius || 0) + 1);
                        updateCirclingBullet(state, bullet);
                    },
                });
            }
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => {
        const p = (enemy.time % 800) / 800;
        fillCircle(context, {x: 0, y: 0, radius: 100}, 'black');
        context.strokeStyle = enemy.baseColor;
        context.lineWidth = 4;
        context.beginPath();
        const theta = p * 2 * Math.PI;
        const dTheta = 2 * Math.PI / 10;
        for (let i = 0; i < 8; i++) {
            context.beginPath();
            const curveTheta = 0.28 * Math.PI * (8 - i) / 8;
            const y = 100 - 200 * Math.sin(curveTheta);
            //const w = 0.75 * Math.sqrt(10000 - y * y);
            const w = 200 - 200 * Math.cos(curveTheta)
            drawOval(context, {x: w / 3 * Math.cos(theta + i * dTheta), y: y + 15, w, h: w / 4});
            context.stroke();
        }
    }),
};

const miniCycloneBullet: Partial<Bullet<Enemy>> = {
    warningTime: 1500,
    duration: 1500,
    radius: 0.5 * window.BASE_ENEMY_BULLET_RADIUS,
    friction: 0.25,
    update(state: GameState, bullet: Bullet<Enemy>) {
        updateSimpleBullet(state, bullet);
        const spiralDuration = 1000;
        if (bullet.time % 100 === 0 /*&& bullet.time < bullet.duration - spiralDuration*/) {
            const parity = bullet.time % 200 === 100;
            const theta = Math.PI * bullet.time / 600 + (parity ? Math.PI : 0);
            shootCirclingBullet(state, bullet.source, theta, 0, {
                anchor: bullet,
                duration: spiralDuration,
                orbitRadius: 5,
                radius: 0.8 * window.BASE_ENEMY_BULLET_RADIUS,
                vTheta: 3 * Math.PI,
                update: updateSpiralBullet,
            });
        }
    }
}

export const dustDevil: EnemyDefinition<TornadoParams> = {
    name: 'Dust Devil',
    statFactors: {
        attacksPerSecond: 0.75,
        damage: 0.75,
        speed: 0.8,
    },
    initialParams: {heading: 0},
    radius: 24,
    update(state: GameState, enemy: Enemy<TornadoParams>): void {
        moveEnemyInDirection(state, enemy, enemy.params.heading);
        if (isEnemyPositionInvalid(state, enemy)) {
            const {x, y} = getTargetVector(enemy, enemy.disc);
            // Choose a heading that is generally towards the center of the current disc.
            enemy.params.heading = Math.atan2(y, x) + (0.5 - Math.random()) * Math.PI / 3;
        }
        const aggroRadius = 350;
        const {x, y, distance2} = getTargetVector(enemy, state.hero);
        if (distance2 <= aggroRadius * aggroRadius) {
            enemy.params.heading
            if (enemy.modeTime >= 1000 && enemy.attackCooldown <= state.fieldTime) {
                enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                // const power = Math.min(1, enemy.level / 90);
                shootBulletAtHero(state, enemy, 1.5 * window.BASE_ENEMY_BULLET_SPEED, miniCycloneBullet);
            }
        }
        if (distance2 <= 500 * 500) {
            // Change heading to the hero any time they are in range.
            enemy.params.heading = Math.atan2(y, x);
            if (enemy.modeTime % 200 === 0) {
                const parity = enemy.modeTime % 400 === 200;
                const theta = Math.PI * enemy.modeTime / 600 + (parity ? Math.PI : 0);
                shootCirclingBullet(state, enemy, theta, 0, {
                    duration: 1500,
                    orbitRadius: 5,
                    radius: 0.8 * window.BASE_ENEMY_BULLET_RADIUS,
                    vTheta: 3 * Math.PI,
                    update(state: GameState, bullet: Bullet<Enemy>) {
                        bullet.orbitRadius = Math.min(40, (bullet.orbitRadius || 0) + 1);
                        updateCirclingBullet(state, bullet);
                    },
                });
            }
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => {
        const p = (enemy.time % 800) / 800;
        fillCircle(context, {x: 0, y: 0, radius: 100}, 'black');
        context.strokeStyle = enemy.baseColor;
        context.lineWidth = 4;
        context.beginPath();
        const theta = p * 2 * Math.PI;
        const dTheta = 2 * Math.PI / 10;
        for (let i = 0; i < 8; i++) {
            context.beginPath();
            const curveTheta = 0.28 * Math.PI * (8 - i) / 8;
            const y = 100 - 200 * Math.sin(curveTheta);
            //const w = 0.75 * Math.sqrt(10000 - y * y);
            const w = 200 - 200 * Math.cos(curveTheta)
            drawOval(context, {x: w / 3 * Math.cos(theta + i * dTheta), y: y, w: 15 + (i % 2) * 5, h: w / 4});
            context.stroke();
        }
    }),
};
