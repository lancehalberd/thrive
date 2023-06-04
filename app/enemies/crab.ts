import { BASE_DROP_CHANCE, BASE_ENEMY_BULLET_RADIUS } from 'app/constants';
import { fillCircle } from 'app/render/renderGeometry';
import { isEnemyOffDisc, moveEnemyInDirection, shootBulletArc, shootBulletAtHero } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';
import Random from 'app/utils/Random';


export const crab: EnemyDefinition = {
    name: 'Crab',
    statFactors: {
        attacksPerSecond: 1,
    },
    initialParams: {},
    dropChance: 1.5 * BASE_DROP_CHANCE,
    experienceFactor: 2,
    radius: 25,
    update(state: GameState, enemy: Enemy): void {
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
                shootBulletAtHero(state, enemy, 100, {radius: 1.5 * BASE_ENEMY_BULLET_RADIUS, damage: 2 * enemy.damage});
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
        if (enemy.modeTime % 500 === 0) {
            const expirationTime = state.fieldTime + 500;
            shootBulletArc(state, enemy, 0, Math.PI / 8, 3, enemy.mode === 'moveRight' ? 150 : 100, {expirationTime});
            shootBulletArc(state, enemy, Math.PI, Math.PI / 8, 3, enemy.mode === 'moveLeft' ? 150 : 100, {expirationTime});
        }
        if (isAggro && enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            //shootEnemyBullet(state, enemy, 100, 0);
            //shootEnemyBullet(state, enemy, -100, 0);
            shootBulletAtHero(state, enemy, 100, {radius: 1.5 * BASE_ENEMY_BULLET_RADIUS, damage: 2 * enemy.damage});
        }
        if (enemy.modeTime >= 1000) {
            enemy.setMode('choose');
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, enemy.baseColor);
        /*fillCircle(context, {
            x: enemy.x + 16 * Math.cos(Math.PI / 2),
            y: enemy.y + 16 * Math.sin(Math.PI / 2),
            radius: 3,
        }, 'black');
        fillCircle(context, {
            x: enemy.x + 16 * Math.cos(Math.PI / 6),
            y: enemy.y + 16 * Math.sin(Math.PI / 6),
            radius: 3,
        }, 'black');
        fillCircle(context, {
            x: enemy.x + 16 * Math.cos(5 * Math.PI / 6),
            y: enemy.y + 16 * Math.sin(5 * Math.PI / 6),
            radius: 3,
        }, 'black');*/
        context.strokeStyle = 'black';
        context.beginPath();
        context.lineWidth = 2;
        for (let i = 0; i < 2; i++) {
            const theta = Math.PI * i;
            const dx = Math.cos(theta), dy = Math.sin(theta);
            context.moveTo(enemy.x + 5 * dx, enemy.y + 5 * dy - 4);
            context.lineTo(enemy.x + 23 * dx, enemy.y + 23 * dy - 8);
            context.moveTo(enemy.x + 5 * dx, enemy.y + 5 * dy);
            context.lineTo(enemy.x + 23 * dx, enemy.y + 23 * dy);
            context.moveTo(enemy.x + 5 * dx, enemy.y + 5 * dy + 4);
            context.lineTo(enemy.x + 23 * dx, enemy.y + 23 * dy + 8);
        }
        context.stroke();
    }
};
