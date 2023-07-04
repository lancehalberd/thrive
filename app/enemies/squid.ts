import { fillCircle } from 'app/render/renderGeometry';
import { turnTowardsTarget, shootBulletArc } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';


export const squid: EnemyDefinition = {
    name: 'Squid',
    statFactors: {},
    initialParams: {},
    radius: 24,
    update(state: GameState, enemy: Enemy): void {
        enemy.vx = (enemy.vx || 0);
        enemy.vy = (enemy.vy || 0);
        const aggroRadius = 300;
        const {distance2} = getTargetVector(enemy, state.hero);
        const isAggro = distance2 <= aggroRadius * aggroRadius;
        if (enemy.mode === 'choose') {
            turnTowardsTarget(state, enemy, isAggro ? state.hero : enemy.disc, 0.1);
            // Slowly "fall" forwards wiggling a bit from side to side
            const sideValue = Math.sin(state.fieldTime / 500);
            enemy.vx += 4 * Math.cos(enemy.theta) + 0.2 * sideValue * Math.cos(enemy.theta + Math.PI / 2);
            enemy.vy += 4 * Math.sin(enemy.theta) + 0.2 * sideValue * Math.sin(enemy.theta + Math.PI / 2);
            const mag = Math.sqrt(enemy.vx*enemy.vx + enemy.vy * enemy.vy);
            if (mag > 50){
                enemy.vx *= 50 / mag;
                enemy.vy *= 50 / mag;
            }
            const delay = isAggro ? 1000 : 2000;
            if (enemy.modeTime >= delay && Math.random() < 0.05) {
                enemy.setMode('burst');
            }
            enemy.x += enemy.vx * window.FRAME_LENGTH / 1000;
            enemy.y += enemy.vy * window.FRAME_LENGTH / 1000;
            return;
        }
        if (enemy.mode === 'burst') {
            for (let i = 0; i < 4; i++) {
                const randomDirection = enemy.theta + (Math.random() - 0.5) * Math.PI / 4;
                const randomSpread = Math.PI / 12 + Math.random() * Math.PI / 3;
                const speed = 0.8 * window.BASE_ENEMY_BULLET_SPEED + i * 0.2 * window.BASE_ENEMY_BULLET_SPEED;
                shootBulletArc(state, enemy, randomDirection, randomSpread, 3, speed);
            }
            // Bursts backwards.
            enemy.vx = -200 * Math.cos(enemy.theta);
            enemy.vy = -200 * Math.sin(enemy.theta);
            enemy.setMode('glide')
            return;
        }
        if (enemy.mode === 'glide') {
            enemy.vx *= 0.98;
            enemy.vy *= 0.98;
            enemy.x += enemy.vx * window.FRAME_LENGTH / 1000;
            enemy.y += enemy.vy * window.FRAME_LENGTH / 1000;
            if (enemy.modeTime >= 500 && Math.random() < 0.05) {
                enemy.setMode('choose');
            }
            return;
        }
    },
    render: renderSquid,
};


function renderSquid(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
    const tentacleDirection = ((enemy.modeTime % 800) < 400) ? -1 : 1;
    fillCircle(context, enemy, 'black');
    context.save();
        context.translate(enemy.x, enemy.y);
        context.rotate(enemy.theta);
        // "Body"
        context.fillStyle = enemy.baseColor;
        context.beginPath();
        context.arc(0, 0, enemy.radius, Math.PI / 2,  3 * Math.PI / 2);
        context.lineTo(0, -enemy.radius);
        context.fill();

        // Tentacles
        context.strokeStyle = enemy.baseColor;
        context.lineWidth = 4;
        context.beginPath();

        // Top tentacle
        context.moveTo(0, -enemy.radius / 2);
        context.arcTo(
            enemy.radius / 4, -enemy.radius / 2 + tentacleDirection * enemy.radius / 4,
            enemy.radius / 2, -enemy.radius / 2,
            enemy.radius / 4
        );

        // Middle tentacle
        context.moveTo(0, 0);
        context.arcTo(
            enemy.radius / 4, 0 + tentacleDirection * enemy.radius / 4,
            enemy.radius / 2, 0,
            enemy.radius / 4
        );
        context.arcTo(
            3 * enemy.radius / 4, 0 - tentacleDirection * enemy.radius / 4,
            enemy.radius, 0,
            enemy.radius / 4
        );

        // Bottom tentacle
        context.moveTo(0, enemy.radius / 2);
        context.arcTo(
            enemy.radius / 4, enemy.radius / 2 + tentacleDirection * enemy.radius / 4,
            enemy.radius / 2, enemy.radius / 2,
            enemy.radius / 4
        );

        context.stroke();
    context.restore();
}
