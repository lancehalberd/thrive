import { updateCirclingBullet, updateSimpleBullet } from 'app/utils/bullet';
import { getBaseWeaponDpsForLevel, rollForCritDamage } from 'app/utils/coreCalculations';


function getArmorShred(state: GameState, chargeLevel: number): number {
    return state.hero.armorShredEffect * (0.01 + 0.02 * chargeLevel);
}


function getChargeDamage(state: GameState, chargeLevel: number): number {
    if (chargeLevel <= 1) {
        return 1;
    }
    return chargeLevel + state.hero.chargeDamage;
}

function getNormalizedTargetVector(source: Point, target: Point): {x: number, y: number} {
    const dx = target.x - source.x, dy = target.y - source.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag) {
        return {x: dx / mag, y : dy / mag};
    }
    return {x: 1, y: 0};
}

export function basicBullet(state: GameState, source: Hero, weapon: Weapon, target: Point): Bullet {
    const {x, y} = getNormalizedTargetVector(source, target);
    const critDamage = rollForCritDamage(state);
    return {
        time: 0,
        baseX: source.x,
        baseY: source.y,
        x: source.x,
        y: source.y,
        radius: weapon.radius * (1.2 ** (source.attackChargeLevel - 1)),
        vx: weapon.speed * x,
        vy: weapon.speed * y,
        damage: Math.ceil(weapon.damage * getChargeDamage(state, source.attackChargeLevel) * source.damage * critDamage),
        chargeGain: 0.1,
        isCrit: critDamage > 1,
        isEnemyPiercing: (source.attackChargeLevel >= 2),
        source,
        duration: 1000 * weapon.range / weapon.speed,
        update: updateSimpleBullet,
        hitTargets: new Set(),
        armorShred: getArmorShred(state, source.attackChargeLevel),
        warningTime: 0,
    };
}

const bowShots: Shot[] = [
    {
        generateBullet(state: GameState, source: Hero, weapon: Weapon, target: Point): Bullet {
            const speed = weapon.speed * (0.8 + 0.2 * (source.attackChargeLevel));
            const critDamage = rollForCritDamage(state, 0.1 * (source.attackChargeLevel - 1));
            const range = weapon.range + 50 * (source.attackChargeLevel - 1);
            return {
                ...basicBullet(state, source, weapon, target),
                duration: 1000 * range / speed,
                radius: weapon.radius + (source.attackChargeLevel - 1),
                vx: speed * Math.cos(source.theta),
                vy: speed * Math.sin(source.theta),
                damage: Math.ceil(weapon.damage * getChargeDamage(state, source.attackChargeLevel) * source.damage * critDamage),
                // Bow gains charge very fast relative to its rate of fire.
                chargeGain: 0.4,
                isCrit: critDamage > 1,
                isEnemyPiercing: true,
            };
        },
    }
];

function createBow(level: number, name: string): Weapon {
    const attacksPerSecond = window.BASE_ATTACKS_PER_SECOND * 0.8;
    return {
        type: 'weapon',
        weaponType: 'bow',
        level: Math.floor(level),
        name,
        getShots: () => bowShots,
        getAttacksPerSecond: () => attacksPerSecond,
        critChance: 0.2,
        critDamage: 0.5,
        damage: Math.ceil(0.6 * getBaseWeaponDpsForLevel(level) / attacksPerSecond),
        damageOverTimeStackSize: 5,
        chargeLevel: 3,
        range: 400,
        speed: 1.5 * window.BASE_BULLET_SPEED,
        radius: window.BASE_BULLET_RADIUS,
        duration: window.BASE_BULLET_DURATION,
        enchantmentSlots: [],
        bonusEnchantmentSlots: [],
    };
}

export const bows: Weapon[] = [
    createBow(1, 'Primitive Bow'),
    createBow(3, 'Short Bow'),
    createBow(5, 'Recurve Bow'),
    createBow(8, 'Long Bow'),
    createBow(11, 'Crossbow'),
    createBow(15, 'Composite Bow'),
    createBow(21, 'Repeating Crossbow'),
    createBow(32, 'Recurve Crossbow'),
    createBow(44, 'Arbalest'),
    createBow(57, 'Compound Bow'),
    createBow(71, 'Compound Crossbow'),
    createBow(86, 'Adamantine Crossbow'),
    createBow(95, 'Dragonbone Greabow'),
];


const swordShots: Shot[] = [
    {
        generateBullet(state: GameState, source: Hero, weapon: Weapon, target: Point): Bullet {
            return {
                ...basicBullet(state, source, weapon, target),
            };
        },
    }
];

function createSword(level: number, name: string): Weapon {
    return {
        type: 'weapon',
        weaponType: 'sword',
        level,
        name,
        getShots: () => swordShots,
        getAttacksPerSecond: () => window.BASE_ATTACKS_PER_SECOND,
        critChance: 0.05,
        critDamage: 0.5,
        damage: Math.ceil(getBaseWeaponDpsForLevel(level) / window.BASE_ATTACKS_PER_SECOND),
        damageOverTimeStackSize: 5,
        chargeLevel: 2,
        range: 350,
        speed: window.BASE_BULLET_SPEED,
        radius: Math.ceil(1.2 * window.BASE_BULLET_RADIUS),
        duration: window.BASE_BULLET_DURATION,
        enchantmentSlots: [],
        bonusEnchantmentSlots: [],
    };
}

export const swords: Weapon[] = [
    createSword(1, 'Gladius'),
    createSword(2, 'Short Sword'),
    createSword(5, 'Falchion'),
    createSword(8, 'Scimitar'),
    createSword(12, 'Wakizashi'),
    createSword(17, 'Longsword'),
    createSword(27, 'Estoic'),
    createSword(38, 'Broadsword'),
    createSword(50, 'Bastardsword'),
    createSword(63, 'Meteoric Saber'),
    createSword(77, 'Runed Saber'),
    createSword(92, 'Etched Dragon Horn'),
    createSword(95, 'Precursor Blade'),
];

function generateDaggerShot(timingOffset: number, thetaOffset: number): Shot {
    return {
        timingOffset,
        generateBullet(state: GameState, source: Hero, weapon: Weapon, target: Point): Bullet {
            const critDamage = rollForCritDamage(state);
            return {
                ...basicBullet(state, source, weapon, target),
                vx: weapon.speed * Math.cos(source.theta + thetaOffset / source.attackChargeLevel / source.attackChargeLevel),
                vy: weapon.speed * Math.sin(source.theta + thetaOffset / source.attackChargeLevel / source.attackChargeLevel),
                damage: Math.ceil(weapon.damage * getChargeDamage(state, source.attackChargeLevel) * source.damage * critDamage),
                // Dagger gains charge 40% faster than average if every bullet hits.
                chargeGain: 0.05,
                isCrit: critDamage > 1,
                radius: weapon.radius + (source.attackChargeLevel - 1),
            };
        },
    }
}
const daggerShots: Shot[] = [
    generateDaggerShot(0 / 7, 0),
    generateDaggerShot(1 / 7, Math.PI / 18),
    generateDaggerShot(2 / 7, -Math.PI / 18),
    generateDaggerShot(3 / 7, 2 * Math.PI / 18),
    generateDaggerShot(4 / 7, -2 * Math.PI / 18),
    generateDaggerShot(5 / 7, 3 * Math.PI / 18),
    generateDaggerShot(6 / 7, -3 * Math.PI / 18),
];

function createDagger(level: number, name: string): Weapon {
    return {
        type: 'weapon',
        weaponType: 'dagger',
        level: Math.floor(level),
        name,
        getShots: () => daggerShots,
        getAttacksPerSecond: () => window.BASE_ATTACKS_PER_SECOND,
        critChance: 0.05,
        critDamage: 0.5,
        // Dagger would deal 4x sword damage if you hit every shot.
        // However, it is hard to hit most shots, and armor means
        // each shot is less effective than the raw numbers suggest.
        damage: Math.ceil(4 * getBaseWeaponDpsForLevel(level) / window.BASE_ATTACKS_PER_SECOND / 7),
        damageOverTimeStackSize: 16,
        chargeLevel: 2,
        range: 250,
        speed: Math.ceil(window.BASE_BULLET_SPEED * 1.2),
        radius: window.BASE_BULLET_RADIUS,
        duration: window.BASE_BULLET_DURATION,
        enchantmentSlots: [],
        bonusEnchantmentSlots: [],
    };
}

export const daggers: Weapon[] = [
    createDagger(1.5, 'Pugio'),
    createDagger(3, 'Hewing Knife'),
    createDagger(6, 'Cross-hilt Dagger'),
    createDagger(11, 'Tanto'),
    createDagger(17, 'Stiletto'),
    createDagger(23, 'Steel Dirk'),
    createDagger(34, 'Stainless Dirk'),
    createDagger(46, 'Serrated Dirk'),
    createDagger(59, 'Masterful Dirk'),
    createDagger(73, 'Meteoric Dirk'),
    createDagger(88, 'Runed Dirk'),
    createDagger(95, 'Etched Dragon Fang'),
];


function generateKatanaShot(timingOffset: number, offset: number): Shot {
    return {
        timingOffset,
        generateBullet(state: GameState, source: Hero, weapon: Weapon, target: Point): Bullet {
            const speed = weapon.speed * (0.8 + 0.2 * source.attackChargeLevel);
            const critDamage = rollForCritDamage(state);
            const x = source.x + offset * Math.cos(source.theta + Math.PI / 2);
            const y = source.y + offset * Math.sin(source.theta + Math.PI / 2);
            return {
                ...basicBullet(state, source, weapon, target),
                baseX: x,
                baseY: y,
                x,
                y,
                vx: speed * Math.cos(source.theta),
                vy: speed * Math.sin(source.theta),
                damage: Math.ceil(weapon.damage * getChargeDamage(state, source.attackChargeLevel) * source.damage * critDamage),
                // Katana can gain charge almost 2x faster when piercing several enemies.
                chargeGain: 0.05,
                isCrit: critDamage > 1,
                isEnemyPiercing: true,
                radius: weapon.radius + (source.attackChargeLevel - 1),
                duration: 1000 * weapon.range / speed,
            };
        },
    }
}
const katanaShots: Shot[] = [
    generateKatanaShot(0 / 2, 10),
    generateKatanaShot(1 / 2, -10),
];

function createKatana(level: number, name: string): Weapon {
    return {
        type: 'weapon',
        weaponType: 'katana',
        level: Math.floor(level),
        name,
        getShots: () => katanaShots,
        getAttacksPerSecond: () => window.BASE_ATTACKS_PER_SECOND,
        critChance: 0.05,
        critDamage: 1,
        damage: Math.ceil(0.5 * getBaseWeaponDpsForLevel(level) / window.BASE_ATTACKS_PER_SECOND),
        damageOverTimeStackSize: 10,
        chargeLevel: 2,
        range: 300,
        speed: window.BASE_BULLET_SPEED,
        radius: window.BASE_BULLET_RADIUS,
        duration: window.BASE_BULLET_DURATION,
        enchantmentSlots: [],
        bonusEnchantmentSlots: [],
    };
}

export const katanas: Weapon[] = [
    createKatana(1.5, 'Kitetsu I'),
    createKatana(4, 'Yubashiri'),
    createKatana(7, 'Kitetsu II'),
    createKatana(11, 'Shusui'),
    createKatana(16, 'Ichimonji'),
    createKatana(22, 'Soto Muso'),
    createKatana(30, 'Sukesan'),
    createKatana(40, 'Shigure'),
    createKatana(51, 'Kitetsu III'),
    createKatana(64, 'Ame no Habakiri'),
    createKatana(76, 'Wado Ichimonji'),
    createKatana(90, 'Enma'),
    createKatana(95, 'Masamune'),
];


function generateMorningStarShot(timingOffset: number, theta: number, attacksPerSecond: number): Shot {
    return {
        timingOffset,
        generateBullet(state: GameState, source: Hero, weapon: Weapon, target: Point): Bullet {
            const radius = weapon.radius * (1.2 ** (source.attackChargeLevel - 1));//weapon.radius + 5 * (source.attackChargeLevel - 1);
            const orbitRadius = weapon.range + radius / 2;
            const critDamage = rollForCritDamage(state);
            const y = source.y, x = source.x + orbitRadius;
            // duration in ms
            const duration = 1000 / attacksPerSecond;
            return {
                ...basicBullet(state, source, weapon, target),
                baseX: x,
                baseY: y,
                x,
                y,
                vx: 0,
                vy: 0,
                orbitRadius,
                theta,
                vTheta: 2 * Math.PI * 1000 / duration,
                damage: Math.ceil(weapon.damage * getChargeDamage(state, source.attackChargeLevel) * source.damage * critDamage),
                chargeGain: 0.1,
                isCrit: critDamage > 1,
                isEnemyPiercing: true,
                radius,
                // Only the first shot is used for normal attacks.
                duration,
                update: updateCirclingBullet,
            };
        },
    }
}

function getMorningStarAttacksPerSecond(state: GameState, weapon: Weapon): number {
    const charged = state.hero.attackChargeLevel > 1;
    const baseAttacksPerSecond = 3 * state.hero.attacksPerSecond * (charged ? 1.5 : 1);
    const shotCount = Math.max(1, Math.ceil(baseAttacksPerSecond));
    // This is supposed to just be the attacks per second for the weapon without
    // adding any bonuses, so we need to remove the hero bonus so it doesn't
    // count twice.
    return baseAttacksPerSecond / shotCount / state.hero.attacksPerSecond;
}

function getMorningStarShots(state: GameState, weapon: Weapon): Shot[] {
    const charged = state.hero.attackChargeLevel > 1;
    const baseAttacksPerSecond = 3 * state.hero.attacksPerSecond * (charged ? 1.5 : 1);
    const shotCount = Math.max(1, Math.ceil(baseAttacksPerSecond));
    const actualAttacksPerSecond = baseAttacksPerSecond / shotCount;
    const shots: Shot[] = [];
    for (let i  =0; i < shotCount; i++) {
        shots.push(generateMorningStarShot(0, 2 * Math.PI * i / shotCount, actualAttacksPerSecond));
    }
    return  shots;
}

function createMorningStar(level: number, name: string): Weapon {
    const attacksPerSecond = 3;
    return {
        type: 'weapon',
        weaponType: 'morningStar',
        level: Math.floor(level),
        name,
        getShots: getMorningStarShots,
        getAttacksPerSecond:getMorningStarAttacksPerSecond,
        critChance: 0.05,
        critDamage: 0.5,
        // This results in 1.4x normal damage if all attacks hit.
        damage: Math.ceil(1.4 * getBaseWeaponDpsForLevel(level) / attacksPerSecond),
        damageOverTimeStackSize: 2,
        chargeLevel: 2,
        range: 150,
        speed: window.BASE_BULLET_SPEED,
        radius: 1.5 * window.BASE_BULLET_RADIUS,
        duration: window.BASE_BULLET_DURATION,
        enchantmentSlots: [],
        bonusEnchantmentSlots: [],
    };
}

export const morningStars: Weapon[] = [
    createMorningStar(1, 'Heavy Vine'),
    createMorningStar(5, 'Leather Whip'),
    createMorningStar(8, 'Chain Whip'),
    createMorningStar(14, 'Ball and Chain'),
    createMorningStar(20, 'Steel Flail'),
    createMorningStar(27, 'Ninetails'),
    createMorningStar(36, 'Morning Star'),
    createMorningStar(46, 'Flaming Whip'),
    createMorningStar(58, 'Orichalcum Whip'),
    createMorningStar(72, 'Adamantine Morning Star'),
    createMorningStar(85, 'Vampire Slayer'),
    createMorningStar(95, 'Dragontail Flail'),
];


const wandShots: Shot[] = [{
    generateBullet(state: GameState, source: Hero, weapon: Weapon, target: Point): Bullet {
        let dx = target.x - source.x, dy = target.y - source.y;
        const mag = Math.sqrt(dx * dx + dy * dy) - 75;
        const minRadius = 100;
        const maxRadius = 300;
        const targetX = source.x + dx, targetY = source.y + dy;
        const radius = source.attackChargeLevel > 1 ? minRadius : Math.max(minRadius, Math.min(maxRadius, mag));
        const speed = weapon.speed * (source.attackChargeLevel > 1 ? 1.5 : 1);
        const critDamage = rollForCritDamage(state);
        const theta = 2 * Math.PI * Math.random();
        const x = targetX + radius * Math.cos(theta);
        const y = targetY + radius * Math.sin(theta);

        // This gets smaller faster the lower weapon range is.
        const damageP = Math.max(0.2, Math.min(1, 1 - 0.5 * (mag - minRadius) / weapon.range));
        return {
            ...basicBullet(state, source, weapon, target),
            baseX: x,
            baseY: y,
            x,
            y,
            vx: speed * Math.cos(theta + Math.PI),
            vy: speed * Math.sin(theta + Math.PI),
            damage: Math.ceil(weapon.damage * getChargeDamage(state, source.attackChargeLevel) * source.damage * critDamage) * damageP,
            chargeGain: 0.2,
            isCrit: critDamage > 1,
            isEnemyPiercing: radius <= minRadius,
            radius: weapon.radius + (source.attackChargeLevel - 1) - 5 + 10 * damageP,
            duration: 1000 * radius / speed,
            // Double armor shred effect
            armorShred: 2 * getArmorShred(state, source.attackChargeLevel),
        };
    },
}];

function createWand(level: number, name: string): Weapon {
    const attacksPerSecond = 5 * window.BASE_ATTACKS_PER_SECOND;
    return {
        type: 'weapon',
        weaponType: 'wand',
        level: Math.floor(level),
        name,
        getShots: () => wandShots,
        getAttacksPerSecond: () => attacksPerSecond,
        critChance: 0.05,
        critDamage: 0.5,
        damage: Math.ceil(1.5 * getBaseWeaponDpsForLevel(level) / attacksPerSecond),
        damageOverTimeStackSize: 5,
        chargeLevel: 4,
        range: 300,
        speed: window.BASE_BULLET_SPEED,
        radius: window.BASE_BULLET_RADIUS,
        duration: window.BASE_BULLET_DURATION,
        enchantmentSlots: [],
        bonusEnchantmentSlots: [],
    };
}

export const wands: Weapon[] = [
    createWand(1, 'Potent Stick'),
    createWand(4, 'Balsa Wand'),
    createWand(6, 'Juniper Wand'),
    createWand(10, 'Pine Wand'),
    createWand(15, 'Rosewood Wand'),
    createWand(21, 'Rowan Wand'),
    createWand(29, 'Oak Wand'),
    createWand(39, 'Ebony Wand'),
    createWand(50, 'Ironwood Wand'),
    createWand(63, 'Intricate Wand'),
    createWand(75, 'Runed Wand'),
    createWand(89, 'Orichalcum Wand'),
    createWand(95, 'Precursor Wand'),
];

export const weaponTypes: WeaponType[] = [
    'bow',
    'dagger',
    'katana',
    'morningStar',
    'sword',
    'wand',
];

export const weaponTypeLabels: {[key in WeaponType]: string} = {
    bow: 'Bow',
    dagger: 'Dagger',
    katana: 'Katana',
    morningStar: 'Morning Star',
    wand: 'Wand',
    sword: 'Sword',
}

export const weaponsByType: {[key in WeaponType]: Weapon[]} = {
    bow: bows,
    dagger: daggers,
    katana: katanas,
    sword: swords,
    morningStar: morningStars,
    wand: wands,
}

export const allWeapons: Weapon[][] = Object.values(weaponsByType);

