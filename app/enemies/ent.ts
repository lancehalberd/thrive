import { fillCircle } from 'app/render/renderGeometry';
import { renderNormalizedEnemy, shootBulletAtHero, shootBulletCircle, shootCirclingBullet } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';


export const ent: EnemyDefinition = {
    name: 'Ent',
    statFactors: {
        attacksPerSecond: 0.5,
        maxLife: 2,
        armor: 2,
    },
    initialParams: {},
    dropChance: 2 * window.BASE_DROP_CHANCE,
    uniqueMultiplier: 2,
    experienceFactor: 2,
    radius: 32,
    portalChance: 0.2,
    portalDungeonType: 'tree',
    update(state: GameState, enemy: Enemy): void {
        if (state.fieldTime % 500 === 0) {
            shootCirclingBullet(state, enemy, 0, enemy.radius + 120, {
                warningTime: 500,
                vTheta: Math.PI / 2,
                duration: 2500
            });
            shootCirclingBullet(state, enemy, Math.PI, enemy.radius + 120, {
                vTheta: Math.PI / 2,
                warningTime: 500,
                duration: 2500
            });
        }

        const aggroRadius = 600;
        const {distance2} = getTargetVector(enemy, state.hero);
        if (distance2 > aggroRadius * aggroRadius) {
            return;
        }

        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootBulletAtHero(state, enemy, 0.8 * window.BASE_ENEMY_BULLET_SPEED, {
                duration: 2000,
                damage: 3 * enemy.damage,
                radius: 2 * window.BASE_ENEMY_BULLET_RADIUS,
                onDeath(state: GameState, bullet: Bullet) {
                    shootBulletCircle(state, enemy, Math.random() * 2 * Math.PI, 6, window.BASE_ENEMY_BULLET_SPEED, {
                        baseX: bullet.x,
                        baseY: bullet.y,
                        x: bullet.x,
                        y: bullet.y,
                    });
                }
            });
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => {
        fillCircle(context, {x: 0, y: 0, radius: 100}, 'black');
        context.fillStyle = enemy.baseColor;
        context.beginPath();
        context.moveTo(0, -100);
        context.lineTo(100 * Math.cos(1 * Math.PI / 3), 100 * Math.sin(1 * Math.PI / 3));
        context.lineTo(100 * Math.cos(2 * Math.PI / 3), 100 * Math.sin(2 * Math.PI / 3));
        context.fill();
        fillCircle(context, {x: 0, y: -60, radius: 40}, enemy.baseColor);
        fillCircle(context, {x: -40, y: -30, radius: 40}, enemy.baseColor);
        fillCircle(context, {x: 40, y: -30, radius: 40}, enemy.baseColor);
    }),
};

