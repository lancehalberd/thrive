interface Bullet extends Circle {
    // These are the base location points for oscillating bullets.
    baseX: number
    baseY: number
    vx: number
    vy: number
    orbitRadius?: number
    theta?: number
    vTheta?: number
    damage: number
    // If this is set, this damage will be dealt over 1 second while a target is on the bullet
    // and the bullet will no longer hit for regular damage.
    damageOverTime?: number
    // Amount of charge the player will gain for hitting an enemy.
    chargeGain?: number
    isEnemyPiercing?: boolean
    // Total duration of the bullet in milliseconds.
    // A bullet expires when time >= duration.
    duration: number
    source?: Hero|Enemy
    update(state: GameState, bullet: Bullet): void
    onDeath?: (state: GameState, bullet: Bullet) => void
    onHit?: (state: GameState, bullet: Bullet) => void
    // Occurs when a bullet hits an enemy or its duration runs out.
    // Use if you want the same effect for onHit/onDeath but don't
    // want to duplicate the effect when a non-piercing shot hits an enemy.
    onHitOrDeath?: (state: GameState, bullet: Bullet) => void
    hitTargets: Set<any>
    time: number
    isCrit?: boolean
    armorShred: number
    amplitude?: number
    frequency?: number
    warningTime: number
    // Set to true when a bullet enters the player's shave radius
    shaveStarted?: boolean
    // Set to true when a bullet exits the player's shave radius
    shaveCompleted?: boolean
    // Amount to slow bullets by each second.
    friction?: number
}
