interface Shot {
    // [0, 1) defaults to 0.
    // This shot will fire this percent of the way between default shot times for this shots attacksPerSecond
    timingOffset?: number
    generateBullet(state: GameState, source: Hero, weapon: Weapon, target: Point): Bullet|undefined
}

type WeaponType = 'katana'|'dagger'|'sword'|'bow'|'morningStar'|'wand';
type ArmorType = 'lightArmor'|'mediumArmor'|'heavyArmor';

type WeaponEnchantmentType = 'attackSpeed'|'critChance'|'critDamage'|'damage'|'dropLevel';
type ArmorEnchantmentType  = 'speed'|'armor'|'life'|'potionEffect'|'dropChance';

type EnchantmentType =  ArmorEnchantmentType | WeaponEnchantmentType;

interface BasicItemEnchantment {
    enchantmentType: 'empty' | EnchantmentType
    value: number
}

type ItemEnchantment = BasicItemEnchantment | UniqueArmorEnchantmentInstance | UniqueWeaponEnchantmentInstance;

interface Weapon {
    type: 'weapon'
    weaponType: WeaponType
    level: number
    getAttacksPerSecond: (state: GameState, weapon: Weapon) => number
    critChance: number
    critDamage: number
    damage: number
    chargeLevel: number
    speed: number
    range: number
    radius: number
    duration: number
    name: string
    getShots: (state: GameState, weapon: Weapon) => Shot[]
    enchantmentSlots: ItemEnchantment[]
    bonusEnchantmentSlots: ItemEnchantment[]
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
    bonusEnchantmentSlots: ItemEnchantment[]
}

interface Enchantment {
    type: 'enchantment'
    name: string
    level: number
    weaponEnchantmentType: WeaponEnchantmentType
    armorEnchantmentType: ArmorEnchantmentType
    strength: number
}

interface UniqueEnchantment {
    key: string
    name: string
    chance: number
    enchantmentType: 'uniqueArmorEnchantment'|'uniqueWeaponEnchantment'
    getDescription: (state: GameState, enchantment: UniqueEnchantmentInstance) => string[]
    // Modify the hero stats after all other enchantments are applied (not implemented yet)
    modifyHero?: (state: GameState, enchantment: UniqueEnchantmentInstance) => void
    // Modify each bullet as it is shot
    modifyBullet?: (state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet) => void
    // Modify the actual weapon stats (only applies on weapons)
    modifyWeapon?: (enchantment: UniqueEnchantmentInstance, weapon: Weapon) => void
    // Modify the actual weapon stats (only applies on armors)
    modifyArmor?: (enchantment: UniqueEnchantmentInstance, armor: Armor) => void
    // Called when charge attack is activated. If this returns true, the default charge behavior will not apply.
    onActivateCharge?: (state: GameState, enchantment: UniqueEnchantmentInstance) => boolean|void
    // Called when guard skill is activated. If this returns true, the default behavior will not apply.
    onActivateGuardSkill?: (state: GameState, enchantment: UniqueEnchantmentInstance) => boolean|void
    // Called when the player is hit by a bullet.
    onHit?: (state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet) => void
    // Called when the player shaves a bullet.
    onShave?: (state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet) => void
    // Sets these flags on the player
    flags?: HeroFlag[]
    invalidTypes?: (WeaponType | ArmorType)[]
}


interface UniqueEnchantmentInstance {
    uniqueEnchantmentKey: string
    tier: 1|2|3|4|5
}
interface UniqueArmorEnchantmentInstance extends UniqueEnchantmentInstance {
    enchantmentType: 'uniqueArmorEnchantment'
}
interface UniqueWeaponEnchantmentInstance extends UniqueEnchantmentInstance {
    enchantmentType: 'uniqueWeaponEnchantment'
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
