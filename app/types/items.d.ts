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

interface Shot {
    // [0, 1) defaults to 0.
    // This shot will fire this percent of the way between default shot times for this shots attacksPerSecond
    timingOffset?: number
    generateBullet(state: GameState, source: Hero, weapon: Weapon): Bullet
}

type WeaponType = 'katana'|'dagger'|'sword'|'bow'|'morningStar'|'staff';
type ArmorType = 'lightArmor'|'mediumArmor'|'heavyArmor';

type WeaponEnchantmentType = 'attackSpeed'|'critChance'|'critDamage'|'damage';
type ArmorEnchantmentType  = 'speed'|'armor'|'life'|'potionEffect';

type EnchantmentType =  ArmorEnchantmentType | WeaponEnchantmentType;

interface ItemEnchantment {
    enchantmentType: 'empty' | EnchantmentType
    value: number
}

interface Weapon {
    type: 'weapon'
    weaponType: WeaponType
    level: number
    attacksPerSecond: number
    critChance: number
    critDamage: number
    damage: number
    chargeLevel: number
    speed: number
    radius: number
    duration: number
    name: string
    shots: Shot[]
    enchantmentSlots: ItemEnchantment[]
}

interface Armor {
    type: 'armor'
    armorType: ArmorType
    level: number
    life: number
    armor: number
    speedFactor: number
    name: string
    enchantmentSlots: ItemEnchantment[]
}

interface Enchantment {
    type: 'enchantment'
    name: string
    level: number
    weaponEnchantmentType: WeaponEnchantmentType
    armorEnchantmentType: ArmorEnchantmentType
    strength: number
}

type Item = Armor | Weapon | Enchantment;
type Equipment = Armor | Weapon;

interface BaseLoot extends Geometry {
    disc: Disc
    activate(state: GameState): void
    render(context: CanvasRenderingContext2D, state: GameState): void
    sell(): void
}

interface ArmorLoot extends BaseLoot {
    type: 'armor'
    armor: Armor
}
interface WeaponLoot extends BaseLoot {
    type: 'weapon'
    weapon: Weapon
}
interface EnchantmentLoot extends BaseLoot {
    type: 'enchantment'
    enchantment: Enchantment
}

interface InventorySlot extends Rect {
    item?: Item
}


type Loot = ArmorLoot | WeaponLoot | EnchantmentLoot;
