import { fillCircle } from 'app/render/renderGeometry';
import { createEnemy, moveEnemyInCurrentDirection, shootEnemyBullet } from 'app/utils/enemy';
import { getTargetVector, turnTowardsAngle } from 'app/utils/geometry';


export const lord: EnemyDefinition = {
    name: 'Lord',
    statFactors: {
        maxLife: 2.5,
        damage: 1,
        attacksPerSecond: 0.4,
        speed: 0.4,
    },
    initialParams: {},
    dropChance: 2 * window.BASE_DROP_CHANCE,
    uniqueMultiplier: 2,
    experienceFactor: 5,
    radius: 28,
    portalChance: 0.2,
    portalDungeonType: 'tree',
    update(state: GameState, enemy: Enemy): void {
        if (!enemy.disc) {
            return;
        }
        const aggroRadius = 600;
        const {x, y, distance2} = getTargetVector(enemy, state.hero);
        if (distance2 > aggroRadius * aggroRadius) {
            return;
        }
        enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.atan2(y, x));
        enemy.x += enemy.speed * Math.cos(enemy.theta) * window.FRAME_LENGTH / 1000;
        enemy.y += enemy.speed * Math.sin(enemy.theta) * window.FRAME_LENGTH / 1000;

        enemy.minions = enemy.minions.filter(m => m.life > 0);
        const maxMinions = Math.min(5, 2 + Math.floor(enemy.level / 3));
        if (enemy.attackCooldown <= state.fieldTime && enemy.minions.length < maxMinions) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            for (const theta of [enemy.theta + Math.PI / 2, enemy.theta - Math.PI / 2]) {
                const minion = createEnemy(state,
                    enemy.x + enemy.radius * Math.cos(theta),
                    enemy.y + enemy.radius * Math.sin(theta), lordsMinion, enemy.level, enemy.disc);
                minion.theta = theta;
                enemy.minions.push(minion);
                minion.master = enemy;
            }
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, enemy.baseColor);
        fillCircle(context, {
            x: enemy.x,
            y: enemy.y,
            radius: 5,
        }, 'black');
        fillCircle(context, {
            x: enemy.x + 15 * Math.cos(enemy.theta),
            y: enemy.y + 15 * Math.sin(enemy.theta),
            radius: 5,
        }, 'black');

    }
};

function turnTowardsTarget(state: GameState, enemy: Enemy, target: Circle): void {
    const {x, y} = getTargetVector(enemy, target);
    enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.atan2(y, x));
}

export const lordsMinion: EnemyDefinition = {
    name: 'Peasant',
    statFactors: {
        maxLife: 0.5,
        armor: 0,
        attacksPerSecond: 0.5,
    },
    initialParams: {},
    dropChance: 0,
    experienceFactor: 0.1,
    radius: 20,
    update(state: GameState, enemy: Enemy): void {
        if (!enemy.disc) {
            return;
        }
        const master = enemy.master && enemy.master.life > 0 ? enemy.master : undefined;
        const aggroRadius = 400;
        const {distance2} = getTargetVector(enemy, state.hero);
        if (distance2 <= aggroRadius * aggroRadius) {
            // Leash back to master for a bit after attacking.
            if (master && enemy.attackCooldown - state.fieldTime > 400) {
                // Enemy moves in its current direction unless it gets too far from the master.
                const {distance2} = getTargetVector(enemy, master);
                if (distance2 >= 300 * 300) {
                    turnTowardsTarget(state, enemy, master);
                }
            } else {
                // Chase the player when it can attack soon.
                turnTowardsTarget(state, enemy, state.hero);
            }
            moveEnemyInCurrentDirection(state, enemy);
            if (enemy.attackCooldown <= state.fieldTime) {
                enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                shootEnemyBullet(state, enemy, window.BASE_ENEMY_BULLET_SPEED * Math.cos(enemy.theta), window.BASE_ENEMY_BULLET_SPEED * Math.sin(enemy.theta));
            }
        } else if (master) {
            // Enemy moves in its current direction unless it gets too far from the master.
            const {distance2} = getTargetVector(enemy, master);
            if (distance2 >= 200 * 200) {
                turnTowardsTarget(state, enemy, master);
            }
            moveEnemyInCurrentDirection(state, enemy);
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, enemy.baseColor);
        fillCircle(context, {
            x: enemy.x + 12 * Math.cos(enemy.theta),
            y: enemy.y + 12 * Math.sin(enemy.theta),
            radius: 2,
        }, 'black');
        fillCircle(context, {
            x: enemy.x,
            y: enemy.y,
            radius: 2,
        }, 'black');

    }
};

