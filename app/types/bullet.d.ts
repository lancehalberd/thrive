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
    // Bullet will be removed after this timestamp
    expirationTime: number
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
}
