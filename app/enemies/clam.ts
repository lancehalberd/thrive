import { BASE_DROP_CHANCE, BASE_ENEMY_BULLET_RADIUS } from 'app/constants';
import { fillCircle } from 'app/render/renderGeometry';
import { turnTowardsTarget, shootBulletArc, shootBulletAtHero } from 'app/utils/enemy';


export const clam: EnemyDefinition = {
    name: 'Clam',
    statFactors: {
        attacksPerSecond: 2,
        life: 2,
        armor: 5,
    },
    initialParams: {},
    dropChance: 2 * BASE_DROP_CHANCE,
    experienceFactor: 2,
    radius: 30,
    portalChance: 0.2,
    portalDungeonType: 'reef',
    update(state: GameState, enemy: Enemy): void {
        if (enemy.mode === 'closed' || enemy.mode === 'choose') {
            turnTowardsTarget(state, enemy, state.hero);
            enemy.mode = 'closed';
            enemy.armor = enemy.baseArmor * 10;
            return;
        } else {
            enemy.armor = enemy.baseArmor / 10;
        }

        turnTowardsTarget(state, enemy, state.hero, 0.1);
        if (enemy.mode === 'opening') {
            if (enemy.attackCooldown <= state.fieldTime) {
                enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                shootBulletAtHero(state, enemy, 120, {radius: 1.5 * BASE_ENEMY_BULLET_RADIUS});
            }
            if (enemy.modeTime >= 400) {
                enemy.setMode('open');
            }
            return;
        }
        if (enemy.mode === 'closing') {
            if (enemy.modeTime >= 400) {
                enemy.setMode('closed');
            }
            return;
        }
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootBulletArc(state, enemy, enemy.theta, Math.PI, 7, 100);
        }
        if (enemy.modeTime >= 2000) {
            enemy.setMode('closing');
        }
    },
    onHit(state: GameState, enemy: Enemy): void {
        if (enemy.mode === 'closed') {
            enemy.setMode('opening');
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, 'black');
        fillCircle(context, {...enemy, radius: 5}, enemy.baseColor);
        context.save();
            context.translate(enemy.x, enemy.y);
            context.rotate(enemy.theta);
            context.fillStyle = enemy.baseColor;
            if (enemy.mode === 'opening' || enemy.mode === 'closing') {
                context.fillStyle = enemy.baseColor;
                context.beginPath();
                context.arc(0, 0, enemy.radius, Math.PI / 2,  3 * Math.PI / 2);
                if ((enemy.modeTime >= 200 && enemy.mode === 'closing') || (enemy.modeTime <= 200 && enemy.mode === 'opening')) {
                    context.arc(-enemy.radius, 0, Math.sqrt(2) * enemy.radius, 5 * Math.PI / 3,  1 * Math.PI / 3, false);
                } else {
                    context.lineTo(0, -enemy.radius);
                }
                context.fill();
            } else if (enemy.mode === 'open') {
                context.fillStyle = enemy.baseColor;
                context.beginPath();
                context.arc(0, 0, enemy.radius, Math.PI / 2,  3 * Math.PI / 2);
                context.arc(enemy.radius, 0, Math.sqrt(2) * enemy.radius, 4 * Math.PI / 3,  2 * Math.PI / 3, true);
                context.fill();
            } else {
                fillCircle(context, {...enemy, x: 0, y: 0}, enemy.baseColor);
            }
            /*let p = 1
            if (enemy.mode === 'opening') {
                p = Math.max(0.2, 1 - enemy.modeTime / 1000);
            } else if (enemy.mode === 'closing') {
                p = Math.min(1, 0.2 + enemy.modeTime / 1000);
            } else if (enemy.mode === 'open') {
                p = 0.2;
            }
            const drawArc = (p: number) => {
                if (p === 0.5) {
                    context.lineTo(0, -enemy.radius);
                } else if (p < 0.5) {
                    const x =
                }
            }
            // Fill in the shell cover
            context.fillStyle = enemy.baseColor;
            context.beginPath();
            context.arc(0, 0, enemy.radius, Math.PI / 2,  3 * Math.PI / 2);
            drawArc(p);
            context.fill();
            // Draw lines across the shell
            */
        context.restore();
    }
};
