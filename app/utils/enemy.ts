import { FRAME_LENGTH } from 'app/constants';

export function createEnemy(x: number, y: number, definition: EnemyDefinition, level: number): Enemy {
    const heroDamage = Math.ceil(20 * Math.pow(1.05, level));
    const heroAttacksPerSecond = 2 + 0.02 * level;
    const heroMaxLife = 20 * (level + 1);
    const dps = heroAttacksPerSecond * heroDamage;
    const targetDuration = 2 + level * 8 / 100;
    const maxLife = Math.ceil((dps * targetDuration) * (definition.statFactors.maxLife ?? 1));
    return {
        definition,
        x,
        y,
        maxLife,
        life: maxLife,
        level,
        speed: 75 * (definition.statFactors.speed ?? 1) * (0.9 + 0.2 * Math.random()),
        armor: level,
        damage: Math.floor(
            (heroMaxLife / 10 + heroMaxLife / 10 * level / 100) * (definition.statFactors.damage ?? 1)
        ),
        attacksPerSecond: (1 + 0.05 * level) * (definition.statFactors.attacksPerSecond ?? 1),
        attackCooldown: 0,
        radius: definition.radius,
        theta: 0,
        minions: [],
    };
}

export function shootEnemyBullet(state: GameState, enemy: Enemy, vx: number, vy: number, duration: number = 1000) {
    //const mag = Math.sqrt(vx * vx + vy * vy);
    state.enemyBullets.push({
        //x: enemy.x + vx / mag * enemy.radius,
        //y: enemy.y + vy / mag * enemy.radius,
        x: enemy.x,
        y: enemy.y,
        damage: enemy.damage,
        radius: 5,
        vx,
        vy,
        expirationTime: state.fieldTime + duration,
    });
}

export function moveEnemyInCurrentDirection(state: GameState, enemy: Enemy): void {
    enemy.x += enemy.speed * Math.cos(enemy.theta) / FRAME_LENGTH;
    enemy.y += enemy.speed * Math.sin(enemy.theta) / FRAME_LENGTH;
}
