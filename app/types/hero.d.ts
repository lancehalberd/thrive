
interface Hero extends CoreHeroStats, Vitals, Geometry {
    overworldX: number
    overworldY: number
    disc: Disc
    // The angle the hero is facing.
    theta: number
    damageHistory: number[]
    recentDamageTaken: number
    weaponProficiency: {[key in WeaponType]?: WeaponProficiency}
    weaponMastery: WeaponMasteryMap
    bossRecords: {[key in string]: number}
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
    dropChance: number
    dropLevel: number
    vx: number
    vy: number
}

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

type WeaponMasteryMap = {[key in WeaponType]?: number}
