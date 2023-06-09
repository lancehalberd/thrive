import { BASE_ENEMY_BULLET_RADIUS, BASE_ENEMY_SPEED, FRAME_LENGTH } from 'app/constants';
import { getVigorEnchantment } from 'app/enchantments';
import { fillCircle } from 'app/render/renderGeometry';
import { chaseTarget, createEnemy, moveEnemyInDirection, moveEnemyToTarget, shootBulletArc, shootBulletCircle, shootEnemyBullet } from 'app/utils/enemy';
import { getTargetVector, turnTowardsAngle } from 'app/utils/geometry';
import Random from 'app/utils/Random';
import { updateReturnBullet } from 'app/weapons';

const attackModes = <const>['novas','pinwheels','petals'];
type AttackMode = typeof attackModes[number];

interface SpiderParams {
    attackTime: number
    attackMode: AttackMode
    attackSchedule: AttackMode[]
}
export const spider: EnemyDefinition<SpiderParams> = {
    name: 'Spider',
    statFactors: {
        maxLife: 5,
        damage: 1,
    },
    initialParams: {
        attackTime: 0,
        attackMode: 'petals',
        attackSchedule: [],
    },
    dropChance: 1,
    experienceFactor: 20,
    radius: 48,
    update(state: GameState, enemy: Enemy<SpiderParams>): void {
        if (!enemy.disc) {
            return;
        }
        const nextAttack = () => {
            if (!enemy.params.attackSchedule.length) {
                enemy.params.attackSchedule = Random.shuffle([...attackModes]);
            }
            enemy.params.attackMode = enemy.params.attackSchedule.pop()!;
            enemy.params.attackTime = 0;
        };
        enemy.params.attackTime += FRAME_LENGTH;
        if (enemy.params.attackMode === 'novas') {
            const spacing = 800;
            if (enemy.params.attackTime % spacing === 0) {
                const count = 10;
                const parity = [0, 2, 1, 3][(enemy.params.attackTime / spacing) % 4];
                shootBulletCircle(state, enemy, parity * 2 * Math.PI / count / 4, count, 60, {expirationTime: state.fieldTime + 3000});
            }
            if (enemy.params.attackTime >= spacing * 4) {
                nextAttack();
            }
        } else if (enemy.params.attackMode === 'petals') {
            const spacing = 200;
            if (enemy.params.attackTime % spacing === 0) {
                const count = (enemy.life <= enemy.maxLife / 2) ? 5 : 3;
                shootBulletCircle(state, enemy, enemy.params.attackTime / spacing * 2 * Math.PI / 30, count, 100, {
                    expirationTime: state.fieldTime + 3000,
                    update: updateReturnBullet,
                });
            }
            if (enemy.params.attackTime >= spacing * 20) {
                nextAttack();
            }
        } else {
            nextAttack();
        }
        /*if (!enemy.minions.length && enemy.life <= enemy.maxLife / 2) {
            for (let i = 0; i < 3; i++) {
                const theta = i * 2 * Math.PI / 3;
                const minion = createEnemy(
                    enemy.disc.x + (enemy.disc.radius - 30) * Math.cos(theta),
                    enemy.disc.y + (enemy.disc.radius - 30) * Math.sin(theta), guardianTurret, enemy.level, enemy.disc);
                minion.theta = theta;
                enemy.minions.push(minion);
                minion.master = enemy;
            }
        }
        if (enemy.mode === 'choose') {
            enemy.speed = BASE_ENEMY_SPEED;
            chaseTarget(state, enemy, state.hero);
            if (enemy.modeTime >= 400) {
                enemy.setMode(Random.element(['moveToEdge', 'moveToEdge', 'moveToCenter', 'chase']));
                //enemy.setMode(Random.element(['moveToCenter']));
            }
            return;
        }
        if (enemy.mode === 'moveToEdge') {
            enemy.speed = 1.2 * BASE_ENEMY_SPEED;
            let {x, y, distance2} = getTargetVector(enemy.disc, enemy);
            if (distance2 >= (enemy.disc.radius * 0.8) ** 2) {
                enemy.setMode(Random.element(['shoot', 'shoot', 'circle']));
            } else {
                enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.atan2(y, x));
                moveEnemyInDirection(state, enemy);
            }
            return;
        }
        if (enemy.mode === 'moveToCenter') {
            enemy.speed = 1.2 * BASE_ENEMY_SPEED;
            if (moveEnemyToTarget(state, enemy, enemy.disc)) {
                enemy.setMode(Random.element(['chasingSpirals', 'crossingSpirals']));
                //enemy.setMode(Random.element(['chasingSpirals']));
            }
            return;
        }
        if (enemy.mode === 'chasingSpirals') {
            enemy.theta = turnTowardsAngle(enemy.theta, 0.2, -Math.PI / 2);
            if (enemy.modeTime < 400) {
                return;
            }
            if (enemy.modeTime % 200 === 0) {
                const expirationTime = state.fieldTime + 2000;
                for (let i = 0; i < 2; i++) {
                    const thetaIndex = (enemy.modeTime - 400) / 200 + i;
                    const theta = -Math.PI / 2 + (i + 1) * thetaIndex * Math.PI / 12;
                    shootEnemyBullet(state, enemy, 100 * Math.cos(theta), 100 * Math.sin(theta), {expirationTime});
                    shootEnemyBullet(state, enemy, 100 * Math.cos(theta + Math.PI), 100 * Math.sin(theta + Math.PI), {expirationTime});
                }
            }
            if (enemy.modeTime >= 4000) {
                enemy.setMode('choose');
            }
            return;
        }
        if (enemy.mode === 'crossingSpirals') {
            enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.PI / 2);
            if (enemy.modeTime < 400) {
                return;
            }
            if (enemy.modeTime % 200 === 0) {
                const expirationTime = state.fieldTime + 2000;
                for (let i = 0; i < 2; i++) {
                    const thetaIndex = (enemy.modeTime - 400) / 200;
                    const theta = Math.PI / 2 + thetaIndex * Math.PI / 6 * (i ? -1 : 1);
                    shootEnemyBullet(state, enemy, 100 * Math.cos(theta), 100 * Math.sin(theta), {expirationTime});
                }
            }
            if (enemy.modeTime >= 4000) {
                enemy.setMode('choose');
            }
            return;
        }
        if (enemy.mode === 'shoot') {
            if (enemy.modeTime < 600) {
                const {x, y} = getTargetVector(enemy, state.hero);
                enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.atan2(y, x));
            }
            if (enemy.modeTime === 1000) {
                shootEnemyBullet(state, enemy,
                    200 * Math.cos(enemy.theta), 200 * Math.sin(enemy.theta),
                    {
                        expirationTime: state.fieldTime + 2000,
                        damage: enemy.damage * 5,
                        radius: 3 * BASE_ENEMY_BULLET_RADIUS,
                    }
                );
            }
            if (enemy.modeTime >= 1500) {
                enemy.setMode('charge');
            }
            return;
        }
        if (enemy.mode === 'charge') {
            enemy.speed = 1.5 * BASE_ENEMY_SPEED;
            moveEnemyInDirection(state, enemy);
            if (enemy.modeTime % 200 === 0) {
                const vx = 120 * Math.cos(enemy.theta + Math.PI / 2);
                const vy = 120 * Math.sin(enemy.theta + Math.PI / 2);
                shootEnemyBullet(state, enemy, vx, vy, {expirationTime: state.fieldTime + 3000});
                shootEnemyBullet(state, enemy, -vx, -vy, {expirationTime: state.fieldTime + 3000});
            }
            if (enemy.modeTime >= 3000) {
                enemy.setMode('choose');
            }
            // Stop earlier if it hits the outside of the ring.
            if (enemy.modeTime >= 1000) {
                let {distance2} = getTargetVector(enemy.disc, enemy);
                if (distance2 >= (enemy.disc.radius * 0.9) **2) {
                    enemy.setMode('choose');
                }
            }
            return;
        }
        if (enemy.mode === 'chase') {
            enemy.speed = BASE_ENEMY_SPEED;
            chaseTarget(state, enemy, state.hero);
            if (enemy.modeTime % 800 === 0) {
                shootBulletArc(state, enemy, enemy.theta, Math.PI / 6, 3, 200);
            }
            if (enemy.modeTime >= 4000) {
                enemy.setMode('choose');
            }
            return;
        }
        if (enemy.mode === 'circle') {
            enemy.speed = 2 * BASE_ENEMY_SPEED;
            let {x, y} = getTargetVector(enemy, enemy.disc);
            enemy.theta = Math.atan2(y, x);
            moveEnemyInDirection(state, enemy, enemy.theta + Math.PI / 2);
            if (enemy.modeTime % 600 === 0) {
                shootBulletArc(state, enemy, enemy.theta, Math.PI / 6, 3, 200);
            }
            if (enemy.modeTime >= 6000) {
                enemy.setMode('choose');
            }
            return;
        }*/
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

const guardianTurret: EnemyDefinition = {
    name: 'Turret',
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
    update(state: GameState, enemy: Enemy): void {
        if (!enemy.disc) {
            return;
        }
        const {x, y} = getTargetVector(enemy, enemy.disc);
        enemy.theta = turnTowardsAngle(enemy.theta, 0.1, Math.atan2(y, x));
        if (enemy.modeTime > 1000 && enemy.modeTime % 400 === 0) {
            shootBulletArc(state, enemy, enemy.theta, 2 * Math.PI / 3, 2, 150);
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, 'yellow');
        fillCircle(context, {
            x: enemy.x + 20 * Math.cos(enemy.theta + Math.PI / 3),
            y: enemy.y + 20 * Math.sin(enemy.theta + Math.PI / 3),
            radius: 5,
        }, 'black');
        fillCircle(context, {
            x: enemy.x + 20 * Math.cos(enemy.theta - Math.PI / 3),
            y: enemy.y + 20 * Math.sin(enemy.theta - Math.PI / 3),
            radius: 5,
        }, 'black');
    }
};
