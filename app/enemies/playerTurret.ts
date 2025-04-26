import { uniqueEnchantmentHash } from 'app/uniqueEnchantmentHash';
import { fillCircle } from 'app/render/renderGeometry';
import { isEnemyTargetable } from 'app/utils/bullet';
import { getClosestElement, getTargetVector, turnTowardsAngle } from 'app/utils/geometry';


interface PlayerTurretParams {
    duration: number
}

// Currently player minions are just invulnerable enemies that shoot player bullets.
export const playerTurret: EnemyDefinition<PlayerTurretParams> = {
    name: 'Player Turret',
    statFactors: {},
    initialParams: {duration: 2000},
    dropChance: 0,
    experienceFactor: 0,
    radius: 20,
    isInvulnerable: true,
    update(state: GameState, enemy: Enemy<PlayerTurretParams>): void {
        const closestEnemy = getClosestElement(enemy, state.enemies.filter(e => isEnemyTargetable(state, e)));
        if (!closestEnemy) {
            return;
        }
        const {x, y} = getTargetVector(enemy, closestEnemy);
        enemy.theta = turnTowardsAngle(enemy.theta, 0.2, Math.atan2(y, x));

        const weapon = state.hero.equipment.weapon;
        const attacksPerSecond = weapon.getAttacksPerSecond(state, weapon) * state.hero.attacksPerSecond;

        // Life falls to 0 over the turrets duration so the lifebar serves as a timer.
        enemy.life = enemy.maxLife * Math.max(0, 1 - enemy.time / enemy.params.duration);

        const attackCooldownDuration = 1000 / attacksPerSecond;
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + attackCooldownDuration;
        }
        const attackTime = attackCooldownDuration - (enemy.attackCooldown - state.fieldTime);
        for (const shot of weapon.getShots(state, weapon)) {
            const shotTime = attackCooldownDuration * (shot.timingOffset ?? 0);
            if (shotTime >= attackTime - window.FRAME_LENGTH / 2 && shotTime < attackTime + window.FRAME_LENGTH / 2) {
                // Setting the source here is a little hacky and might have unpredictable results in some cases.
                const bullet = shot.generateBullet(state,
                    // Fake hero standing where the turret is.
                    {...state.hero, x: enemy.x, y: enemy.y, theta: enemy.theta},
                    weapon,
                    closestEnemy || {x: enemy.x + 200 * Math.cos(enemy.theta), y: enemy.y + 200 * Math.sin(enemy.theta)}
                );
                if (!bullet) {
                    continue;
                }
                for (const enchantment of state.hero.uniqueEnchantments) {
                    const definition = uniqueEnchantmentHash[enchantment.uniqueEnchantmentKey];
                    definition.modifyBullet?.(state, enchantment, bullet);
                    // Turret bullets should not grant charge.
                    bullet.chargeGain = 0;
                }
                state.heroBullets.push(bullet);
            }
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, enemy.baseColor);
        fillCircle(context, {
            x: enemy.x + 20 * Math.cos(enemy.theta),
            y: enemy.y + 20 * Math.sin(enemy.theta),
            radius: 5,
        }, 'black');
    }
};
