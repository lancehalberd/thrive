interface CoreHeroStats {
    level: number
    experience: number
}
interface WeaponProficiency {
    level: number
    experience: number
}

interface Vitals {
    life: number
    maxLife: number
    speed: number
    baseArmor: number
    armor: number
    damage: number
    attacksPerSecond: number
    // Indiciates the next timestamp that an attack can be performed.
    attackCooldown: number
}

interface Hero extends CoreHeroStats, Vitals, Geometry {
    overworldX: number
    overworldY: number
    // The angle the hero is facing.
    theta: number
    damageHistory: number[]
    recentDamageTaken: number
    weaponProficiency: {[key in WeaponType]?: WeaponProficiency}
    equipment: {
        weapon: Weapon
        armor: Armor
    }
    weapons: Weapon[],
    armors: Armor[],
    enchantments: Enchantment[],
    activeEnchantment?: Enchantment,
    // How much the player has charged since he last attacked, which will be applied to the next weapon cycle.
    chargingLevel: number
    // How charged the player's current attacks are.
    attackChargeLevel: number
    // How long the player's current charged attack status lasts. 1 full weapon cycle by default.
    attackChargeDuration: number
    potions: number
    isShooting: boolean
    critChance: number
    critDamage: number
    chargeDamage: number
    armorShredEffect: number
    potionEffect: number
}
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
    setMode(this: Enemy, mode: string)
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
    render: (context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => void
}

interface FieldText {
    x: number
    y: number
    vx: number
    vy: number
    expirationTime: number
    time: number
    text: string
    color?: string
    borderColor?: string
}

interface GameState {
    fieldTime: number
    hero: Hero
    heroBullets: Bullet[]
    enemies: Enemy[]
    loot: Loot[]
    activeLoot?: Loot
    portals: Portal[];
    enemyBullets: Bullet[]
    fieldText: FieldText[]
    worldSeed: number
    activeCells: WorldCell[]
    recentCells: WorldCell[]
    cellMap: Map<string, WorldCell>
    activeDiscs: Disc[]
    visibleDiscs: Disc[]
    dungeon?: Dungeon
    gameHasBeenInitialized: boolean
    paused: boolean
    mouse: {
        x: number
        y: number
        isDown: boolean
        wasPressed: boolean
    }
    keyboard: {
        gameKeyValues: number[]
        gameKeysDown: Set<number>
        gameKeysPressed: Set<number>
        // The set of most recent keys pressed, which is recalculated any time
        // a new key is pressed to be those keys pressed in that same frame.
        mostRecentKeysPressed: Set<number>
        gameKeysReleased: Set<number>
    }
    isUsingKeyboard?: boolean
    isUsingXbox?: boolean
    // Row of inventory selected when using gamepad controls
    menuRow: number
    // Column of inventory selected when using gamepad controls
    menuColumn: number
    // Set to true to select player equipment instead of inventory items with gamepad controls
    menuEquipmentSelected: boolean
}

interface MenuOption {
    // getLabel will be used instead of label if defined.
    getLabel?: () => string,
    label?: string,
    onSelect?: () => void,
    getChildren?: () => MenuOption[],
}
