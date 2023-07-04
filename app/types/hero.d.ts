
interface Hero extends CoreHeroStats, Vitals, Geometry {
    overworldX: number
    overworldY: number
    disc: Disc
    // The angle the hero is facing.
    theta: number
    damageHistory: number[]
    recentDamageTaken: number
    proficiency: {[key in ArmorType|WeaponType]?: Proficiency}
    mastery: MasteryMap
    bossRecords: {[key in string]: number}
    equipment: {
        weapon: Weapon
        armor: Armor
    }
    weapons: Weapon[],
    armors: Armor[],
    enchantments: Enchantment[],
    activeEnchantment?: Enchantment,
    uniqueEnchantments: UniqueEnchantmentInstance[],
    // How much the player has charged since he last attacked, which will be applied to the next weapon cycle.
    chargingLevel: number
    // How charged the player's current attacks are.
    attackChargeLevel: number
    // How long the player's current charged attack status will continue for in milliseconds.
    attackChargeDuration: number
    // How long the player's current charge attack status lasted in total in milliseconds.
    totalChargeDuration: number
    potions: number
    isShooting: boolean
    critChance: number
    critDamage: number
    chargeDamage: number
    armorShredEffect: number
    potionEffect: number
    dropChance: number
    dropLevel: number
    lastTimeDamaged: number
    vx: number
    vy: number
    flags: {[key in HeroFlag]?: boolean}
    roll?: {
        start: Point
        goal: Point
        time: number
        duration: number
    }
    guardSkill: {
        cooldownTime: number
        charges: number
        time: number
        duration?: number
    }
}

type HeroFlag = 'noShaveShrink'|'noShaveCharge'

interface CoreHeroStats {
    level: number
    experience: number
}
interface Proficiency {
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
    // Tracks how much damage over time an enemy has taken in the current frame.
    // Used to limit how much damage over time can stack.
    frameDamageOverTime: number
    slowEffects: SlowEffect[]
}

type MasteryMap = {[key in ArmorType|WeaponType]?: number}
