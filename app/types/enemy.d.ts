interface Enemy<EnemyParams=any> extends Vitals, Geometry {
    level: number
    disc: Disc
    definition: EnemyDefinition<EnemyParams>
    params: EnemyParams,
    // The angle the enemy is facing.
    theta: number
    minions: Enemy[]
    master?: Enemy
    // How much the enemy has charged since he last attacked, which will be applied to the next weapon cycle.
    chargingLevel: number
    // How charged the enemy's current attacks are, which lasts for 1 full weapon cycle.
    attackChargeLevel: number
    mode: string
    modeTime: number
    time: number
    warningTime?: number
    setMode(this: Enemy, mode: string): void
    isBoss?: boolean
    isInvulnerable?: boolean
    baseColor: string
    vx: number
    vy: number
    // Tracks how much damage over time an enemy has taken in the current frame.
    // Used to limit how much damage over time can stack.
    frameDamageOverTime: number
}
interface EnemyDefinition<EnemyParams=any> {
    name: string
    statFactors: Partial<Vitals>
    initialParams: EnemyParams
    dropChance?: number
    uniqueMultiplier?: number
    experienceFactor?: number
    solid?: boolean
    radius: number
    isInvulnerable?: boolean
    initialize?: (state: GameState, enemy: Enemy) => void
    update: (state: GameState, enemy: Enemy) => void
    // This is not triggered by damage over time
    onHit?: (state: GameState, enemy: Enemy, bullet: Bullet) => void
    // This is triggered by any damage.
    onDamage?: (state: GameState, enemy: Enemy, bullet: Bullet) => void
    onDeath?: (state: GameState, enemy: Enemy) => void
    // Set on bosses that drop enchantments
    getEnchantment?: (state: GameState, enemy: Enemy) => Enchantment
    // Set on enemies that can drop dungeon portals
    portalChance?: number
    portalDungeonType?: DungeonType
    render: RenderEnemy
}

type RenderEnemy = (context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => void;
