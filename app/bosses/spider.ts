import { FRAME_LENGTH } from 'app/constants';
import { getVigorEnchantment } from 'app/enchantments';
import { fillCircle } from 'app/render/renderGeometry';
import {
    shootBulletCircle, createBombBullet, shootCirclingBullet,
} from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';
import Random from 'app/utils/Random';
import { updateReturnBullet } from 'app/weapons';

const attackModes = <const>['novas','pinwheels','petals'];
type AttackMode = typeof attackModes[number];

interface SpiderParams {
    attackTime: number
    attackMode: AttackMode
    attackSchedule: AttackMode[]
    attackIntensity: number
}
export const spider: EnemyDefinition<SpiderParams> = {
    name: 'Spider',
    statFactors: {
        maxLife: 5,
        damage: 1,
    },
    initialParams: {
        attackTime: 0,
        attackMode: 'pinwheels',
        attackSchedule: [],
        attackIntensity: 0,
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
            enemy.params.attackIntensity = (enemy.life <= enemy.maxLife / 2) ? 1 : 0;
        };
        enemy.params.attackTime += FRAME_LENGTH;
        if (enemy.params.attackMode === 'novas') {
            const spacing = 800 - enemy.params.attackIntensity * 400;
            if (enemy.params.attackTime % spacing === 0 && enemy.params.attackTime <= 3000) {
                const count = 10;
                const parity = [0, 2, 1, 3][(enemy.params.attackTime / spacing) % 4];
                shootBulletCircle(state, enemy, parity * 2 * Math.PI / count / 4, count, 60, {expirationTime: state.fieldTime + 3000});
            }
            if (enemy.params.attackTime >= 3500) {
                nextAttack();
            }
        } else if (enemy.params.attackMode === 'petals') {
            const spacing = 200;
            if (enemy.params.attackTime > spacing * 5 && enemy.params.attackTime % spacing === 0 && enemy.params.attackTime <= spacing * 35) {
                const count = 3 + enemy.params.attackIntensity * 2;
                shootBulletCircle(state, enemy, enemy.params.attackTime / spacing * 2 * Math.PI / 40, count, 110, {
                    expirationTime: state.fieldTime + 3000,
                    update: updateReturnBullet,
                });
            }
            if (enemy.params.attackTime >= spacing * 45) {
                nextAttack();
            }
        } else if (enemy.params.attackMode === 'pinwheels') {
            const spacing = 2000;
            if (enemy.params.attackTime % spacing === FRAME_LENGTH && enemy.params.attackTime < spacing * 4) {
                const count = 3 + enemy.params.attackIntensity;
                for (let r = enemy.radius + 5; r < enemy.radius + 450; r += 40) {
                    for (let i = 0; i < count; i++) {
                        shootCirclingBullet(state, enemy, 2 * Math.PI * i / count + r * Math.PI / 40 / 20, r, {
                            vTheta: - Math.PI / count,
                            warningTime: 1000,
                            expirationTime: state.fieldTime + 3000,
                        });
                    }
                }
            }
            if (enemy.params.attackTime >= spacing * 6) {
                nextAttack();
            }
        } else {
            nextAttack();
        }
        // Face away from the disc.
        const vtheta = Math.PI / 200 * (1.5 -  0.5 * enemy.life / enemy.maxLife);
        enemy.theta += vtheta;
        const targetRadius = Math.round(enemy.params.attackMode === 'petals' ? 0 : 150 * (1 - enemy.life / enemy.maxLife));
        const {distance2} = getTargetVector(enemy, enemy.disc);
        let radius = Math.sqrt(distance2);
        if (radius < targetRadius) radius++;
        else if ( radius > targetRadius) radius--;
        enemy.x = enemy.disc.x + radius * Math.cos(enemy.theta);
        enemy.y = enemy.disc.y + radius * Math.sin(enemy.theta);
        const bombSpacing = 1200 - 400 * enemy.params.attackIntensity;
        if (enemy.modeTime % bombSpacing === 0) {
            const dr = 100 - 70 * (1 - enemy.life / enemy.maxLife);
            for (let r = 50; r < 400; r += dr) {
                const theta = Math.random() * 2 * Math.PI;
                createBombBullet(state, enemy, enemy.disc.x + r * Math.cos(theta), enemy.disc.y + r * Math.sin(theta));
            }
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
