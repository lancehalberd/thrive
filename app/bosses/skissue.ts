import { BASE_ENEMY_BULLET_RADIUS, BASE_ENEMY_BULLET_SPEED, FRAME_LENGTH } from 'app/constants';
import { getVigorEnchantment } from 'app/enchantments';
import { fillCircle } from 'app/render/renderGeometry';
import { createEnemy, shootBulletCircle, shootEnemyBullet, shootBulletAtHero } from 'app/utils/enemy';
import { getTargetVector, turnTowardsAngle } from 'app/utils/geometry';



interface SpiderParams {
}
export const skissue: EnemyDefinition<SpiderParams> = {
    name: 'Skissue',
    statFactors: {
        maxLife: 10,
        damage: 1,
    },
    initialParams: {},
    dropChance: 1,
    experienceFactor: 20,
    radius: 48,
    update(state: GameState, enemy: Enemy<SpiderParams>): void {

        if (enemy.life >= enemy.maxLife * 3 / 4) {
            if (enemy.mode !== 'sakura') {
                 enemy.setMode('sakura');
            }
        } else if (enemy.life >= enemy.maxLife / 2) {
            if (enemy.mode !== 'hanabi') {
                 enemy.setMode('hanabi');
             }
        } else if (enemy.life >= enemy.maxLife / 4) {
            if (enemy.mode !== 'sakura') {
                 enemy.setMode('sakura');
            }
            if (enemy.modeTime % 4000 === 0) {
                    const minion = createEnemy(enemy.x, enemy.y, blob, enemy.level, enemy.disc);
                    enemy.minions.push(minion);
                    minion.master = enemy;
            }
        } else {
            if (enemy.mode !== 'hanabi') {
                 enemy.setMode('hanabi');
            }
            if (enemy.modeTime % 4000 === 0) {
                    const minion = createEnemy(enemy.x, enemy.y, blob, enemy.level, enemy.disc);
                    enemy.minions.push(minion);
                    minion.master = enemy;
            }
        }
        

        /*if (enemy.mode === 'choose') {
            if (enemy.modeTime >= 400) {
                enemy.setMode(Random.element(['sakura', 'hanabi']));
                //enemy.setMode(Random.element(['moveToCenter']));
            }
            return;
        }*/
        if (enemy.mode === 'sakura') {
            if (enemy.minions.filter(E => E.definition === skillPortal).length === 0) {
                //spawn minions
                for (let i = 0; i < 4; i++) {
                    const theta = i * 2 * Math.PI / 4;
                    const minion = createEnemy(
                        enemy.disc.x + (enemy.disc.radius - 30) * Math.cos(theta),
                        enemy.disc.y + (enemy.disc.radius - 30) * Math.sin(theta), skillPortal, enemy.level, enemy.disc);
                    minion.theta = theta;
                    enemy.minions.push(minion);
                    minion.master = enemy;
                }
            }
            if (enemy.modeTime % 100 === 0) {
                const theta1 = Math.PI * 2 / 40000 * enemy.modeTime
                shootBulletCircle(state, enemy, theta1, 5, BASE_ENEMY_BULLET_SPEED, {expirationTime: state.fieldTime + 2000});
            }
            /*if (enemy.modeTime >= 10000) {
                enemy.setMode('choose');
                for (const minion of enemy.minions) {
                    minion.life = 0;
                }
                enemy.minions = [];
            }*/
        }
        if (enemy.mode === 'hanabi') {
            //delete portals
            for (const minion of enemy.minions) {
                if (minion.definition === skillPortal) {
                        minion.life = 0;
                }
            }
            enemy.minions = enemy.minions.filter(E => E.life > 0)
            if (enemy.modeTime % 3600 === 0) {
                shootBulletAtHero(state, enemy, BASE_ENEMY_BULLET_SPEED / 2, {
                    damage: 5 * enemy.damage,
                    radius: BASE_ENEMY_BULLET_RADIUS * 2,
                    expirationTime: state.fieldTime + 2000,
                    onDeath(state: GameState, bullet: Bullet) {
                        for (let i = 0; i < 5; i++) {
                            const bulletTheta = 2 * Math.PI * i / 5;
                            shootEnemyBullet(state, enemy, BASE_ENEMY_BULLET_SPEED * 1.5 * Math.cos(bulletTheta), BASE_ENEMY_BULLET_SPEED * 1.5 * Math.sin(bulletTheta), {                        
                                x: bullet.x,
                                y: bullet.y,
                                baseX: bullet.x,
                                baseY: bullet.y,
                                expirationTime: state.fieldTime + 250,
                                onDeath(state: GameState, bullet: Bullet) {
                                    for (let i = 0; i < 5; i++) {
                                        const bulletTheta = 2 * Math.PI * i / 5;
                                        shootEnemyBullet(state, enemy, BASE_ENEMY_BULLET_SPEED * 2 * Math.cos(bulletTheta), BASE_ENEMY_BULLET_SPEED * 2 * Math.sin(bulletTheta), {                        
                                            x: bullet.x,
                                            y: bullet.y,
                                            baseX: bullet.x,
                                            baseY: bullet.y,
                                            expirationTime: state.fieldTime + 500,
                                            onDeath(state: GameState, bullet: Bullet) {
                                                for (let i = 0; i < 5; i++) {
                                                    const bulletTheta = 2 * Math.PI * i / 5;
                                                    shootEnemyBullet(state, enemy, BASE_ENEMY_BULLET_SPEED * Math.cos(bulletTheta), BASE_ENEMY_BULLET_SPEED * Math.sin(bulletTheta), {                        
                                                    x: bullet.x,
                                                    y: bullet.y,
                                                    baseX: bullet.x,
                                                    baseY: bullet.y,
                                                    expirationTime: state.fieldTime + 2000,
                                                    });
                                                }
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                });
            }
            /*if (enemy.modeTime >= 10000) {
                enemy.setMode('choose');
            }*/
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        context.save();
            context.translate(enemy.x, enemy.y);
            context.rotate(enemy.theta);
            context.scale(enemy.radius, enemy.radius);

            // Black circle
            fillCircle(context, {x: 0, y: 0, radius: 1}, 'black');

            // Colored "split mask halves"
            context.fillStyle = enemy.baseColor;
            context.beginPath();
            context.arc(0, 0, 0.8, Math.PI / 12, 11 * Math.PI / 12);
            context.fill();
            context.beginPath();
            context.arc(0, 0, 0.8, 13 * Math.PI / 12, 23 * Math.PI / 12);
            context.fill();

            // 4 eyes on each mask half
            for (let i = 0; i < 4; i++) {
                const thetaSpace = 5 * Math.PI / 6 / 5;
                const theta = Math.PI / 12 + (1 + i) * thetaSpace;
                fillCircle(context, {x: 0.6 * Math.cos(theta), y: 0.6 * Math.sin(theta), radius: 0.1}, 'black');
                fillCircle(context, {x: 0.6 * Math.cos(-theta), y: 0.6 * Math.sin(-theta), radius: 0.1}, 'black');
            }
        context.restore();
    },
    getEnchantment(state: GameState, enemy: Enemy): Enchantment {
        return getVigorEnchantment(enemy.level);
    },
};

const skillPortal: EnemyDefinition = {
    name: 'portal',
    statFactors: {
        maxLife: 2,
        damage: 1,
        attacksPerSecond: 1,
        armor: 2,
    },
    initialParams: {},
    dropChance: 0,
    experienceFactor: 2,
    radius: 20,
    isInvulnerable: true,
    update(state: GameState, enemy: Enemy<SpiderParams>): void {
        
        if (enemy.life >= enemy.maxLife / 2) {
            const theta = enemy.theta + Math.PI + Math.PI / 250;
            enemy.x = enemy.disc.x + enemy.disc.radius * Math.cos(theta);
            enemy.y = enemy.disc.y + enemy.disc.radius * Math.sin(theta);
            enemy.theta = theta - Math.PI;

            if (enemy.modeTime % 100 === 0 && enemy.modeTime % 2000 < 1500) {
                shootEnemyBullet(state, enemy, BASE_ENEMY_BULLET_SPEED / 2 * Math.cos(enemy.theta), BASE_ENEMY_BULLET_SPEED / 2 * Math.sin(enemy.theta),{expirationTime: state.fieldTime + 3000});
            }
        } else {
            return;
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        context.save();
            context.translate(enemy.x, enemy.y);
            context.rotate(enemy.theta);
            context.scale(enemy.radius, enemy.radius);

            // Black circle
            fillCircle(context, {x: 0, y: 0, radius: 1}, 'black');

            // Colored "split mask halves"
            context.fillStyle = enemy.baseColor;
            context.beginPath();
            context.arc(0, 0, 0.8, Math.PI / 12, 11 * Math.PI / 12);
            context.fill();
            context.beginPath();
            context.arc(0, 0, 0.8, 13 * Math.PI / 12, 23 * Math.PI / 12);
            context.fill();

            // 4 eyes on each mask half
            for (let i = 0; i < 4; i++) {
                const thetaSpace = 5 * Math.PI / 6 / 5;
                const theta = Math.PI / 12 + (1 + i) * thetaSpace;
                fillCircle(context, {x: 0.6 * Math.cos(theta), y: 0.6 * Math.sin(theta), radius: 0.1}, 'black');
                fillCircle(context, {x: 0.6 * Math.cos(-theta), y: 0.6 * Math.sin(-theta), radius: 0.1}, 'black');
            }
        context.restore();
    },
}

const blob: EnemyDefinition = {
    name: 'Blob',
    statFactors: {
        maxLife: 1,
        damage: 1,
        attacksPerSecond: 1,
        armor: 2,
    },
    initialParams: {},
    dropChance: 0,
    experienceFactor: 0,
    radius: 30,
    update(state: GameState, enemy: Enemy<SpiderParams>): void {

        if (enemy.mode === 'choose') {
            const {x, y, distance2} = getTargetVector(enemy, state.hero);
            enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.atan2(y, x));
            enemy.x += enemy.speed * Math.cos(enemy.theta) * FRAME_LENGTH / 1800;
            enemy.y += enemy.speed * Math.sin(enemy.theta) * FRAME_LENGTH / 1800;
            const radius = 30
            if (distance2 <= radius * radius) {
                enemy.setMode('exploding')
            }
        }
        if (enemy.mode === 'exploding') {
            if (enemy.modeTime >= 1000) {
                enemy.life = 0;
                enemy.definition.onDeath?.(state, enemy);
            }
        }
    },
    onDeath(state: GameState, enemy: Enemy): void {
        shootBulletCircle(state, enemy, 0, 30, BASE_ENEMY_BULLET_SPEED * 3, {expirationTime: state.fieldTime + 200});
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
}