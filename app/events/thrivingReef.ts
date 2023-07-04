import { crab } from 'app/enemies/crab';
import { reefUrchin } from 'app/enemies/urchin';
import { fillCircle } from 'app/render/renderGeometry';
import { updateSimpleBullet } from 'app/utils/bullet';
import { createEnemy, getBaseEnemyBullet, renderNormalizedEnemy, shootBulletAtHero, shootBulletCircle, shootCirclingBullet } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';

interface ThrivingReefParams {
    attackTheta: number
}

export const thrivingReef: EnemyDefinition<ThrivingReefParams> = {
    name: 'Thriving Reef',
    statFactors: {
        attacksPerSecond: 0.5,
        maxLife: window.EVENT_BOSS_MAX_LIFE_FACTOR * 0.75,
        armor: 2,
    },
    initialParams: {attackTheta: 0},
    dropChance: 0,
    uniqueMultiplier: 20,
    experienceFactor: 20,
    radius: 80,
    portalChance: 1,
    portalDungeonType: 'pearlTrove',
    initialize(state: GameState, enemy: Enemy): void {
        const disc = enemy.disc;
        // Add holes to reef's disc.
        for (let i = 0; i < 5; i++) {
            const theta = -Math.PI / 2 + 2 * Math.PI * i / 5;
            disc.holes.push({
                x: disc.x + 3 / 5 * disc.radius * Math.cos(theta),
                y: disc.y + 3 / 5 * disc.radius * Math.sin(theta),
                topEdgeColor: disc.topEdgeColor,
                bottomEdgeColor: disc.bottomEdgeColor,
                radius: disc.radius / 5
            });
            // Add urchins between the holes
            createEnemy(state,
                disc.x + 3 / 5 * disc.radius * Math.cos(theta + Math.PI),
                disc.y + 3 / 5 * disc.radius * Math.sin(theta + Math.PI), reefUrchin, enemy.level, disc);
        }
    },
    update(state: GameState, enemy: Enemy<ThrivingReefParams>): void {
        const bulletShieldTime = enemy.time % 2000;
        // The reef generates two circles of spinning bullets around it that move in
        // opposite directions and have clustered bullets with gapbs between them.
        if (bulletShieldTime < 1200) {
            if (bulletShieldTime % 200 === 0) {
                for (let i = 0; i < 5; i++) {
                    const theta = -Math.PI / 2 + 2 * Math.PI * i / 5;
                    shootCirclingBullet(state, enemy, 0, 2 * enemy.disc.radius / 5, {
                        warningTime: 500,
                        theta,
                        vTheta: 2 * Math.PI / 5 / 2,
                        duration: 2500
                    });
                    shootCirclingBullet(state, enemy, Math.PI, 4 * enemy.disc.radius / 5, {
                        warningTime: 500,
                        theta,
                        vTheta: -2 * Math.PI / 10 / 2,
                        duration: 2500
                    });
                    shootCirclingBullet(state, enemy, Math.PI, 4 * enemy.disc.radius / 5, {
                        warningTime: 500,
                        theta: theta + 2 * Math.PI / 10,
                        vTheta: -2 * Math.PI / 10 / 2,
                        duration: 2500
                    });
                }
            }
        }
        if (enemy.time % 5000 === 20) {
            state.enemyBullets.push({
                ...getBaseEnemyBullet(state, enemy),
                damageOverTime: 5 * enemy.damage,
                radius: enemy.radius,
                duration: 5000,
            });
        }

        const disc = enemy.disc;
        if (enemy.mode === 'choose' && enemy.life <= 0.9 * enemy.maxLife) {
            enemy.setMode('phase1');
            createEnemy(state,
                disc.x,
                disc.y - 80, crab, enemy.level, disc, {warningTime: 1000});
            createEnemy(state,
                disc.x,
                disc.y + 80, crab, enemy.level, disc, {warningTime: 1000});
        } else if (enemy.mode === 'phase1' && enemy.life <= 0.7 * enemy.maxLife) {
            enemy.setMode('phase2');
        } else if (enemy.mode === 'phase2' && enemy.life <= 0.5 * enemy.maxLife) {
            enemy.setMode('phase3');
            createEnemy(state,
                disc.x,
                disc.y - 80, crab, enemy.level, disc, {warningTime: 1000});
            createEnemy(state,
                disc.x,
                disc.y + 80, crab, enemy.level, disc, {warningTime: 1000});
        } else if (enemy.mode === 'phase3' && enemy.life <= 0.3 * enemy.maxLife) {
            enemy.setMode('phase4');
        } else if (enemy.mode === 'phase4' && enemy.life <= 0.1 * enemy.maxLife) {
            enemy.setMode('phase5');
            createEnemy(state,
                disc.x,
                disc.y - 80, crab, enemy.level, disc, {warningTime: 1000});
            createEnemy(state,
                disc.x,
                disc.y + 80, crab, enemy.level, disc, {warningTime: 1000});
        }

        const aggroRadius = 600;
        const {distance2} = getTargetVector(enemy, state.hero);
        if (distance2 > aggroRadius * aggroRadius) {
            return;
        }

        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            if (enemy.mode === 'choose' || enemy.mode === 'phase1') {
                shootBulletAtHero(state, enemy, 0.8 * window.BASE_ENEMY_BULLET_SPEED, {
                    duration: 2000,
                    damage: 2 * enemy.damage,
                    radius: 2 * window.BASE_ENEMY_BULLET_RADIUS,
                });
            } else if (enemy.mode === 'phase2' || enemy.mode === 'phase3') {
                shootBulletCircle(state, enemy, enemy.params.attackTheta, 12, 0.8 * window.BASE_ENEMY_BULLET_SPEED, {
                    duration: 2000
                });
                enemy.params.attackTheta += Math.PI / 24;
            } else if (enemy.mode === 'phase3' || enemy.mode === 'phase4') {
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
            } else {
                shootBulletAtHero(state, enemy, 0.8 * window.BASE_ENEMY_BULLET_SPEED, {
                    duration: 2000,
                    damage: 3 * enemy.damage,
                    radius: 2 * window.BASE_ENEMY_BULLET_RADIUS,
                    update(state: GameState, bullet: Bullet) {
                        updateSimpleBullet(state, bullet);
                        if (bullet.time % 500 === 0) {
                            shootBulletCircle(state, enemy, Math.random() * 2 * Math.PI, 6, 0.5 * window.BASE_ENEMY_BULLET_SPEED, {
                                baseX: bullet.x,
                                baseY: bullet.y,
                                x: bullet.x,
                                y: bullet.y,
                            });
                        }
                    }
                });

            }
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => {
        fillCircle(context, {x: 0, y: 0, radius: 100}, 'black');
        context.fillStyle = enemy.baseColor;
        context.beginPath();
        context.moveTo(100, 0);
        for (let i = 1; i <= 5; i++) {
            const theta = 4 * Math.PI * i / 5;
            context.lineTo(100 * Math.cos(theta), 100 * Math.sin(theta));
        }
        context.fill();
        for (let i = 1; i <= 5; i++) {
            const theta = 4 * Math.PI * i / 5 + Math.PI;
            fillCircle(context, {
                x: 65 * Math.cos(theta),
                y: 65 * Math.sin(theta),
                radius: 30,
            }, enemy.baseColor);
        }
    }),
};
