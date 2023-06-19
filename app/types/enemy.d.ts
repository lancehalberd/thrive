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
    setMode(this: Enemy, mode: string): void
    isBoss?: boolean
    isInvulnerable?: boolean
    baseColor: string
    vx: number
    vy: number
}
interface EnemyDefinition<EnemyParams=any> {
    name: string
    statFactors: Partial<Vitals>
    initialParams: EnemyParams
    dropChance?: number
    experienceFactor?: number
    solid?: boolean
    radius: number
    isInvulnerable?: boolean
    update: (state: GameState, enemy: Enemy) => void
    onHit?: (state: GameState, enemy: Enemy, bullet: Bullet) => void
    onDeath?: (state: GameState, enemy: Enemy) => void
    // Set on bosses that drop enchantments
    getEnchantment?: (state: GameState, enemy: Enemy) => Enchantment
    // Set on enemies that can drop dungeon portals
    portalChance?: number
    portalDungeonType?: DungeonType
    render: RenderEnemy
}

type RenderEnemy = (context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => void;
