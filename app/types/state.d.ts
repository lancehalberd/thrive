interface CoreHeroStats {
    level: number
    experience: number
}

interface Circle {
    x: number
    y: number
    radius: number
}

interface Geometry extends Circle {
    // The disc this object is currently on.
    disc?: Disc
}

interface Bullet extends Circle {
    vx: number
    vy: number
    damage: number
    // Bullet will be removed after this timestamp
    expirationTime: number
}

interface Vitals {
    life: number
    maxLife: number
    speed: number
    armor: number
    damage: number
    attacksPerSecond: number
    // Indiciates the next timestamp that an attack can be performed.
    attackCooldown: number
}

interface Hero extends CoreHeroStats, Vitals, Geometry {
    // The angle the hero is facing.
    theta: number
}
interface Enemy extends Vitals, Geometry {
    level: number
    definition: EnemyDefinition
    // The angle the enemy is facing.
    theta: number
    minions: Enemy[]
    master?: Enemy
}
interface EnemyDefinition {
    statFactors: Partial<Vitals>
    experienceFactor?: number
    solid?: boolean
    radius: number
    update: (state: GameState, enemy: Enemy) => void
    render: (context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => void
}

interface GameState {
    fieldTime: number
    hero: Hero
    heroBullets: Bullet[]
    enemies: Enemy[]
    enemyBullets: Bullet[]
    activeDiscs: Disc[]
    visibleDiscs: Disc[]
    gameHasBeenInitialized: boolean
    paused: boolean
    keyboard: {
        gameKeyValues: number[]
        gameKeysDown: Set<number>
        gameKeysPressed: Set<number>
        // The set of most recent keys pressed, which is recalculated any time
        // a new key is pressed to be those keys pressed in that same frame.
        mostRecentKeysPressed: Set<number>
        gameKeysReleased: Set<number>
    }
}

interface Disc extends Geometry {
    links: Disc[]
}
