import { BASE_ENEMY_BULLET_SPEED } from 'app/constants';
import { fillCircle } from 'app/render/renderGeometry';
import { updateSimpleBullet } from 'app/utils/bullet';
import { moveEnemyInDirection, shootBulletAtHero, shootEnemyBullet, turnTowardsTarget } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';

function updateSonarBullet(state: GameState, bullet: Bullet): void {
    const amplitude = Math.min(50, bullet.time / 30);
    if (bullet.amplitude! < 0) {
        bullet.amplitude = -amplitude;
    } else {
        bullet.amplitude = amplitude;
    }
    updateSimpleBullet(state, bullet);
}

export const bat: EnemyDefinition = {
    name: 'Bat',
    statFactors: {
        armor: 2,
        damage: 0.75,
        speed: 0.3,
    },
    initialParams: {},
    radius: 24,
    portalChance: 0.05,
    portalDungeonType: 'cave',
    update(state: GameState, enemy: Enemy): void {
        const aggroRadius = 300;
        const {x, y, distance2} = getTargetVector(enemy, state.hero);
        const isAggro = distance2 <= aggroRadius * aggroRadius;
        if (isAggro) {
            turnTowardsTarget(state, enemy, state.hero);
            // Try to stay a certain distance from the player.
            if (distance2 <= 190 * 190) {
                moveEnemyInDirection(state, enemy, Math.atan2(y, x));
            } else if (distance2 >= 210 * 210){
                moveEnemyInDirection(state, enemy, Math.atan2(y, x) + Math.PI);
            }
        } else {
            if (enemy.mode === 'choose') {
                if (enemy.modeTime >= 200) {
                    enemy.theta = Math.random() * 2 * Math.PI;
                    enemy.setMode('move');
                }
            } else if (enemy.mode === 'move') {
                moveEnemyInDirection(state, enemy);
                if (enemy.modeTime >= 600) {
                    enemy.setMode('choose');
                }
            }
        }
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            if (isAggro) {
                shootEnemyBullet(state, enemy, 0.6 * BASE_ENEMY_BULLET_SPEED * Math.cos(enemy.theta), 0.6 * BASE_ENEMY_BULLET_SPEED * Math.sin(enemy.theta), {
                    duration: 2000, amplitude: 10, frequency: 6,
                    update: updateSonarBullet,
                });
                shootEnemyBullet(state, enemy, 0.6 * BASE_ENEMY_BULLET_SPEED * Math.cos(enemy.theta), 0.6 * BASE_ENEMY_BULLET_SPEED * Math.sin(enemy.theta), {
                    duration: 2000, amplitude: -10, frequency: 6,
                    update: updateSonarBullet,
                });
            } else {
                shootBulletAtHero(state, enemy, 1.2 * BASE_ENEMY_BULLET_SPEED, {amplitude: 20, frequency: 5});
                shootBulletAtHero(state, enemy, 1.2 * BASE_ENEMY_BULLET_SPEED, {amplitude: -20, frequency: 5});
            }
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, 'black');
        fillCircle(context, {
            x: enemy.x + 0.25 * enemy.radius * Math.cos(enemy.theta),
            y: enemy.y + 0.25 * enemy.radius * Math.sin(enemy.theta),
            radius: enemy.radius / 5,
        }, enemy.baseColor);
        context.save();
            context.fillStyle = enemy.baseColor;
            context.beginPath();
            context.translate(enemy.x, enemy.y);
            context.rotate(enemy.theta);
            // left wing
            context.moveTo(enemy.radius / 4, 0);
            context.arcTo(
                enemy.radius / 4, enemy.radius,
                enemy.radius * Math.cos(Math.PI / 6), enemy.radius * Math.sin(Math.PI / 6),
                enemy.radius / 2
            );
            context.arc(0, 0, enemy.radius, Math.PI / 6, 2 * Math.PI / 3);
            //context.lineTo(enemy.radius * Math.cos(4 * Math.PI / 3), enemy.radius * Math.sin(4 * Math.PI / 3))
            // Bottom arcs
            context.lineTo(-enemy.radius / 4, enemy.radius / 2);
            context.lineTo(enemy.radius / 2 * Math.cos(5 * Math.PI / 6), enemy.radius / 2 * Math.sin(5 * Math.PI / 6));
            context.lineTo(-enemy.radius / 4, 0);
            context.lineTo(enemy.radius / 2 * Math.cos(7 * Math.PI / 6), enemy.radius / 2 * Math.sin(7 * Math.PI / 6));
            context.lineTo(-enemy.radius / 4, -enemy.radius / 2);
            context.lineTo(enemy.radius / 2 * Math.cos(4 * Math.PI / 3), enemy.radius / 2 * Math.sin(4 * Math.PI / 3));


            // This seems like it should work, but it looks terrible for some reason
            /*context.arcTo(
                -enemy.radius / 4, enemy.radius / 2,
                enemy.radius / 2 * Math.cos(5 * Math.PI / 6), enemy.radius / 2 * Math.sin(5 * Math.PI / 6),
                enemy.radius / 6
            );
            context.arcTo(
                -enemy.radius / 4, 0,
                enemy.radius / 2 * Math.cos(7 * Math.PI / 6), enemy.radius / 2 * Math.sin(7 * Math.PI / 6),
                enemy.radius / 6
            );
            context.arcTo(
                -enemy.radius / 4, -enemy.radius / 2,
                enemy.radius / 2 * Math.cos(4 * Math.PI / 3), enemy.radius / 2 * Math.sin(4 * Math.PI / 3),
                enemy.radius / 6
            );*/
            // right wing
            context.arc(0, 0, enemy.radius, 4 * Math.PI / 3, 11 * Math.PI / 6);
            context.arcTo(
                enemy.radius / 4, -enemy.radius,
                enemy.radius / 4, 0,
                enemy.radius / 2
            );
            context.fill();
        context.restore();
}
};
