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
    isCrit?: boolean
    armorShred: number
}

interface Shot {
    // [0, 1) defaults to 0.
    // This shot will fire this percent of the way between default shot times for this shots attacksPerSecond
    timingOffset?: number
    generateBullet(state: GameState, source: Hero, weapon: Weapon): Bullet
}

type WeaponType = 'katana'|'dagger'|'sword'|'bow'|'morningStar'|'staff';
type ArmorType = 'lightArmor'|'mediumArmor'|'heavyArmor';

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
}

interface Armor {
    type: 'armor'
    armorType: ArmorType
    level: number
    life: number
    armor: number
    speedFactor: number
    name: string
}

type Item = Armor | Weapon;

interface BaseLoot extends Geometry {
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

interface InventorySlot extends Rect {
    item?: Weapon|Armor
}


type Loot = ArmorLoot | WeaponLoot;
