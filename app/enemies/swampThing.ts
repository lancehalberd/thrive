import { fillCircle } from 'app/render/renderGeometry';
import { getTargetVector} from 'app/utils/geometry';
import {
    getBaseEnemyBullet,
    isEnemyOffDisc,
    moveEnemyToTarget,
    renderNormalizedEnemy,
    shootBulletAtHero,
    shootBulletCircle,
} from 'app/utils/enemy';


const slowBulletStats: Partial<Bullet> = {
    radius: 2 * window.BASE_ENEMY_BULLET_RADIUS,
    duration: 2000,
    slowEffect: {effect: 0.5, duration: 1500},
    render(context: CanvasRenderingContext2D, state: GameState, bullet: Bullet) {
        fillCircle(context, bullet, '#A82', '#860');
    },
}

interface SwampThingParams {
    targetX: number
    targetY: number
}
export const swampThing: EnemyDefinition<SwampThingParams> = {
    name: 'Swamp Thing',
    statFactors: {
        speed: 1.5,
    },
    initialParams: {
        targetX:0,
        targetY:0,
    },
    radius: 30,
    update(state: GameState, enemy: Enemy<SwampThingParams>): void {
        if (enemy.mode === 'choose' && enemy.modeTime >= 500) {
            const aggroRadius = 500;
            const {x, y, distance2} = getTargetVector(enemy, state.hero);
            if (distance2 > aggroRadius * aggroRadius) {
                return;
            }
            enemy.theta = Math.atan2(y, x);
            enemy.params.targetX = state.hero.x + state.hero.vx * 500 / 1000 + 24 * (0.5 - Math.random());
            enemy.params.targetY = state.hero.y + state.hero.vy * 500 / 1000 + 24 * (0.5 - Math.random());
            enemy.setMode('shrink');
            shootBulletCircle(state, enemy, enemy.theta, 6, window.BASE_ENEMY_BULLET_SPEED, slowBulletStats);
        }
        if (enemy.mode === 'shrink') {
            enemy.isInvulnerable = true;
            enemy.radius = Math.max(enemy.radius * 0.95, 2);
            if (enemy.radius <= 4) {
                enemy.setMode('rush');
            }
        }
        if (enemy.mode === 'rush') {
            if (enemy.modeTime % 100 === 0) {
                state.enemyBullets.push({
                    ...getBaseEnemyBullet(state, enemy),
                    damageOverTime: enemy.damage,
                    radius: enemy.radius,
                    duration: 2000,
                    slowEffect: {effect: 0.5, duration: window.FRAME_LENGTH},
                    update(state: GameState, bullet: Bullet) {
                        if (bullet.radius < 50) {
                            bullet.radius += 1;
                        }
                    },
                    renderFloorBefore(context: CanvasRenderingContext2D, state: GameState, bullet: Bullet) {
                        context.save();
                            context.globalAlpha *= Math.min(1, (bullet.duration - bullet.time) / 200);
                            context.lineWidth = 2;
                            context.beginPath();
                            context.arc(bullet.x, bullet.y, bullet.radius, 0, 2 * Math.PI);
                            context.strokeStyle = '#860';
                            context.stroke();
                        context.restore();
                    },
                    renderFloor(context: CanvasRenderingContext2D, state: GameState, bullet: Bullet) {
                        context.save();
                            context.globalAlpha *= Math.min(1, (bullet.duration - bullet.time) / 200);
                            fillCircle(context, bullet, '#A82');
                        context.restore();
                    },
                    render(context: CanvasRenderingContext2D, state: GameState, bullet: Bullet) {
                    }
                });
            }
            if (moveEnemyToTarget(state, enemy, {x: enemy.params.targetX, y: enemy.params.targetY})) {
                enemy.setMode('grow');
            }
            if (isEnemyOffDisc(state, enemy) && enemy.modeTime >= 1000) {
                enemy.setMode('grow');
            }
        }
        if (enemy.mode === 'grow') {
            enemy.radius = Math.min(enemy.radius * 1.05, 30);
            if (enemy.radius >= 30) {
                shootBulletCircle(state, enemy, enemy.theta, 6, window.BASE_ENEMY_BULLET_SPEED, slowBulletStats);
                enemy.isInvulnerable = false;
                enemy.setMode('attack');
            }
        }
        if (enemy.mode === 'attack') {
            if (enemy.attackCooldown <= state.fieldTime) {
                enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                shootBulletAtHero(state, enemy, window.BASE_ENEMY_BULLET_SPEED, {
                    duration: 2000,
                });
            }
            if (enemy.modeTime >= 2000) {
                enemy.setMode('choose');
            }
        }
    },
    render:  renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy<SwampThingParams>) => {
        // fillCircle(context, {x: 0, y: 0, radius: 100}, 'black');
        const offset = (enemy.time % 1000) / 1000;
        const ringCount = 3;
        for (let i = 0; i < ringCount; i++) {
            const p = (offset + i / (ringCount + 1)) % 1;
            context.save();
                context.globalAlpha *= (1 - p) * enemy.radius / 30 / ringCount;
                fillCircle(context, {x: 0, y: 0, radius: p * 100}, enemy.baseColor);
            context.restore();
        }
    }),
};
