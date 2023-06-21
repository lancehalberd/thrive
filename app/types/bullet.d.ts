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
    // Amount of charge the player will gain for hitting an enemy.
    chargeGain?: number
    isEnemyPiercing?: boolean
    // Total duration of the bullet in milliseconds.
    // A bullet expires when time >= duration.
    duration: number
    source?: Hero|Enemy
    update(state: GameState, bullet: Bullet): void
    onDeath?: (state: GameState, bullet: Bullet) => void
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
