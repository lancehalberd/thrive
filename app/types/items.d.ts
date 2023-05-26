interface Bullet extends Circle {
    vx: number
    vy: number
    damage: number
    isEnemyPiercing?: boolean
    // Bullet will be removed after this timestamp
    expirationTime: number
    source?: Hero|Enemy
    update(state: GameState, bullet: Bullet): void
    hitTargets: Set<any>
}

interface Shot {
    // [0, 1) defaults to 0.
    // This shot will fire this percent of the way between default shot times for this shots attacksPerSecond
    timingOffset?: number
    generateBullet(state: GameState, source: Hero|Enemy, weapon: Weapon): Bullet
}

interface Weapon {
    type: string
    level: number
    attacksPerSecond: number
    damage: number
    chargeLevel: number
    speed: number
    radius: number
    duration: number
    name: string
    shots: Shot[]
}

interface BaseLoot extends Geometry {
    activate(state: GameState, loot: BaseLoot): void
    render(context: CanvasRenderingContext2D, state: GameState, loot: BaseLoot): void
    getLevel(loot: BaseLoot): number
}

interface WeaponLoot extends BaseLoot {
    type: 'weapon'
    weapon: Weapon
    activate(state: GameState, loot: WeaponLoot): void
    render(context: CanvasRenderingContext2D, state: GameState, loot: WeaponLoot): void
    getLevel(loot: WeaponLoot): number
}

type Loot = WeaponLoot;
