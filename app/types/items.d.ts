interface Shot {
    // [0, 1) defaults to 0.
    // This shot will fire this percent of the way between default shot times for this shots attacksPerSecond
    timingOffset?: number
    generateBullet(state: GameState, source: Hero, weapon: Weapon): Bullet
}

type WeaponType = 'katana'|'dagger'|'sword'|'bow'|'morningStar'|'staff';
type ArmorType = 'lightArmor'|'mediumArmor'|'heavyArmor';

type WeaponEnchantmentType = 'attackSpeed'|'critChance'|'critDamage'|'damage'|'dropLevel';
type ArmorEnchantmentType  = 'speed'|'armor'|'life'|'potionEffect'|'dropChance';

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
