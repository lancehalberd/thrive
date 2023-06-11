import { BASE_ENEMY_BULLET_RADIUS, BASE_ENEMY_SPEED, FRAME_LENGTH } from 'app/constants';
import { getVigorEnchantment } from 'app/enchantments';
import { fillCircle } from 'app/render/renderGeometry';
import { chaseTarget, createEnemy, moveEnemyInDirection, moveEnemyToTarget, shootBulletArc, shootBulletCircle, shootEnemyBullet,shootBulletAtHero } from 'app/utils/enemy';
import { getTargetVector, turnTowardsAngle } from 'app/utils/geometry';
import Random from 'app/utils/RAndom';
import { updateReturnBullet } from 'app/weapons';

const attackModes = <const>['novas','pinwheels','petals'];
type AttackMode = typeof attackModes[number];

interface SpiderParams {
    attackTime: number
    attackMode: AttackMode
    attackSchedule: AttackMode[]
}
export const skissue: EnemyDefinition<SpiderParams> = {
    name: 'Skissue',
    statFactors: {
        maxLife: 5,
        damage: 1,
    },
    initialParams: {},
    dropChance: 1,
    experienceFactor: 20,
    radius: 48,
    update(state: GameState, enemy: Enemy<SpiderParams>): void {

        if (enemy.minions.length === 0) {
            //spawn minions
            for (let i = 0; i < 7; i++) {
                const theta = i * 2 * Math.PI / 7;
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
            shootBulletCircle(state, enemy, theta1, 7, 100, {expirationTime: state.fieldTime + 2000});
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
        const theta = enemy.theta + Math.PI + Math.PI / 500;
        enemy.x = enemy.disc.x + enemy.disc.radius * Math.cos(theta);
        enemy.y = enemy.disc.y + enemy.disc.radius * Math.sin(theta);
        enemy.theta = theta - Math.PI;

        if (enemy.modeTime % 100 === 0 && enemy.modeTime % 2800 < 2400) {
            shootEnemyBullet(state, enemy, 100 * Math.cos(enemy.theta), 100 * Math.sin(enemy.theta),{expirationTime: state.fieldTime + 1500});
            //shootBulletAtHero(state, enemy, 100)
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
