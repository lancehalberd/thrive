import { BASE_DROP_CHANCE, BASE_ENEMY_BULLET_RADIUS, BASE_ENEMY_BULLET_SPEED } from 'app/constants';
import { fillCircle } from 'app/render/renderGeometry';
import { isEnemyOffDisc, moveEnemyInDirection, renderNormalizedEnemy, shootBulletArc, shootBulletAtHero } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';
import Random from 'app/utils/Random';


export const crab: EnemyDefinition = {
    name: 'Crab',
    statFactors: {
        attacksPerSecond: 1,
    },
    initialParams: {},
    dropChance: 1.5 * BASE_DROP_CHANCE,
    uniqueMultiplier: 2,
    experienceFactor: 2,
    radius: 24,
    update(state: GameState, enemy: Enemy): void {
        enemy.theta = Math.PI / 2;
        const aggroRadius = 400;
        const {distance2} = getTargetVector(enemy, state.hero);
        const isAggro = distance2 <= aggroRadius * aggroRadius;
        if (enemy.mode === 'choose') {
            enemy.setMode(Random.element(['moveLeft', 'moveRight', 'pause', 'pause']));
            /*if (isAggro) {
                if (y < 30) {
                    enemy.setMode('moveUp');
                } else {
                    enemy.setMode(Random.element(['moveLeft', 'moveRight', 'pause']));
                }
            } else {
                enemy.setMode(Random.element(['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'pause', 'pause']));
            }*/
            return;
        }
        if (enemy.mode === 'moveUp') {
            moveEnemyInDirection(state, enemy, -Math.PI / 2, enemy.speed / 2);
            if (enemy.modeTime >= 400) {
                enemy.setMode('choose');
            }
            if (isAggro && enemy.attackCooldown <= state.fieldTime) {
                enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                shootBulletAtHero(state, enemy, BASE_ENEMY_BULLET_SPEED, {radius: 1.5 * BASE_ENEMY_BULLET_RADIUS, damage: 2 * enemy.damage});
            }
            return;
        }
        if (enemy.mode === 'moveDown') {
            moveEnemyInDirection(state, enemy, Math.PI / 2, enemy.speed / 2);
            if (enemy.modeTime >= 400) {
                enemy.setMode('choose');
            }
            return;
        }
        if (enemy.mode === 'moveLeft') {
            moveEnemyInDirection(state, enemy, Math.PI, 1.1 * enemy.speed);
            if (enemy.x < enemy.disc.x && isEnemyOffDisc(state, enemy)) {
                enemy.mode = 'moveRight';
            }
        }
        if (enemy.mode === 'moveRight') {
            moveEnemyInDirection(state, enemy, 0, 1.1 * enemy.speed);
            if (enemy.x > enemy.disc.x && isEnemyOffDisc(state, enemy)) {
                enemy.mode = 'moveLeft';
            }
        }
        if (enemy.mode === 'pause') {
            if (enemy.modeTime >= 400) {
                enemy.setMode('choose');
            }
        }
        if (enemy.modeTime % 1500 === 0) {
            const duration = 500;
            shootBulletArc(state, enemy, 0, Math.PI / 8, 3, enemy.mode === 'moveRight' ? 1.5 * BASE_ENEMY_BULLET_SPEED : BASE_ENEMY_BULLET_SPEED, {duration});
            shootBulletArc(state, enemy, Math.PI, Math.PI / 8, 3, enemy.mode === 'moveLeft' ? 1.5 * BASE_ENEMY_BULLET_SPEED : BASE_ENEMY_BULLET_SPEED, {duration});
        }
        if (isAggro && enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            //shootEnemyBullet(state, enemy, 100, 0);
            //shootEnemyBullet(state, enemy, -100, 0);
            shootBulletAtHero(state, enemy, BASE_ENEMY_BULLET_SPEED, {radius: 1.5 * BASE_ENEMY_BULLET_RADIUS, damage: 2 * enemy.damage, duration: 2000});
        }
        if (enemy.modeTime >= 1000) {
            enemy.setMode('choose');
        }
    },
    render:  renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => {
        fillCircle(context, {x: 0, y: 0, radius: 100}, enemy.baseColor);
        context.strokeStyle = 'black';
        context.fillStyle = 'black';
        fillCircle(context, {x: 0, y: 0, radius: 30}, 'black');
        context.beginPath();
        context.lineWidth = 10;
        const frame = ((enemy.time / 200) | 0) % 2;
        const clawTheta = frame ? Math.PI / 12 : - Math.PI / 12 ;
        const legDelta = frame ? 10 : -10;

        context.moveTo(-25, 50);
        context.lineTo(-50, 120);

        context.moveTo(10, 40);
        context.lineTo(-10, 100 + legDelta);
        context.lineTo(20, 140 + legDelta);

        context.moveTo(30, 30);
        context.lineTo(20, 80 - legDelta);
        context.lineTo(50, 110 - legDelta);


        context.moveTo(-25, -50);
        context.lineTo(-50, -120);

        context.moveTo(10, -40);
        context.lineTo(-10, -100 + legDelta);
        context.lineTo(20, -140 + legDelta);

        context.moveTo(30, -30);
        context.lineTo(20, -80 - legDelta);
        context.lineTo(50, -110 - legDelta);
        context.stroke();

        context.beginPath();
        context.arc(-50, 120, 25, -Math.PI - clawTheta, Math.PI / 2 + clawTheta);
        context.lineTo(-50, 120);
        context.fill();


        context.beginPath();
        context.arc(-50, -120, 25, -Math.PI / 2 + clawTheta, Math.PI - clawTheta);
        context.lineTo(-50, -120);
        context.fill();
    }),
};
