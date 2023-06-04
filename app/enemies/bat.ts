import { fillCircle } from 'app/render/renderGeometry';
import { moveEnemyInDirection, shootBulletAtHero, shootEnemyBullet, turnTowardsTarget } from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';
import { updateSimpleBullet } from 'app/weapons';

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
    radius: 20,
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
                shootEnemyBullet(state, enemy, 60 * Math.cos(enemy.theta), 60 * Math.sin(enemy.theta), {
                    expirationTime: state.fieldTime + 2000, amplitude: 10, frequency: 6,
                    update: updateSonarBullet,
                });
                shootEnemyBullet(state, enemy, 60 * Math.cos(enemy.theta), 60 * Math.sin(enemy.theta), {
                    expirationTime: state.fieldTime + 2000, amplitude: -10, frequency: 6,
                    update: updateSonarBullet,
                });
            } else {
                shootBulletAtHero(state, enemy, 120, {amplitude: 20, frequency: 5});
                shootBulletAtHero(state, enemy, 120, {amplitude: -20, frequency: 5});
            }
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, enemy.baseColor);
        fillCircle(context, {
            x: enemy.x + 0.75 * enemy.radius * Math.cos(enemy.theta),
            y: enemy.y + 0.75 * enemy.radius * Math.sin(enemy.theta),
            radius: enemy.radius / 5,
        }, 'black');
    }
};
