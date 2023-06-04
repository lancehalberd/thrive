import {
    BASE_ATTACKS_PER_SECOND,
    BASE_WEAPON_DPS_PER_LEVEL,
    BASE_BULLET_SPEED,
    BASE_BULLET_RADIUS,
    BASE_BULLET_DURATION,
    FRAME_LENGTH,
} from 'app/constants';
import { rollForCritDamage } from 'app/utils/hero';

export function updateSimpleBullet(state: GameState, bullet: Bullet): void {
    bullet.x += bullet.vx / FRAME_LENGTH;
    bullet.y += bullet.vy / FRAME_LENGTH;
}

function getArmorShred(state: GameState, chargeLevel: number): number {
    return state.hero.armorShredEffect * (0.01 + 0.02 * chargeLevel);
}


function getChargeDamage(state: GameState, chargeLevel: number): number {
    if (chargeLevel <= 1) {
        return 1;
    }
    return chargeLevel + state.hero.chargeDamage;
}

/*
Example damage spread for weapon tiers:
0: 20
1: 35
2: 60
3: 100
4: 150
5: 230
6: 350
7: 500
8: 700
9: 950
10: 1250
11: 1550
12: 1850
13: 2000
*/

const bowShots: Shot[] = [
    {
        generateBullet(state: GameState, source: Hero, weapon: Weapon): Bullet {
            const speed = weapon.speed * (0.6 + 0.4 * source.attackChargeLevel);
            const critDamage = rollForCritDamage(state, 0.1 * source.attackChargeLevel);
            return {
                x: source.x,
                y: source.y,
                radius: weapon.radius + (source.attackChargeLevel - 1),
                vx: speed * Math.cos(source.theta),
                vy: speed * Math.sin(source.theta),
                damage: Math.ceil(weapon.damage * getChargeDamage(state, source.attackChargeLevel) * source.damage * critDamage),
                // Bow gains charge very fast relative to its rate of fire.
                chargeGain: 0.5,
                isCrit: critDamage > 1,
                isEnemyPiercing: true,
                source,
                expirationTime: state.fieldTime + weapon.duration,
                update: updateSimpleBullet,
                hitTargets: new Set(),
                armorShred: getArmorShred(state, source.attackChargeLevel),
            };
        },
    }
];

function createBow(level: number, name: string): Weapon {
    const attacksPerSecond = BASE_ATTACKS_PER_SECOND * 0.8;
    return {
        type: 'weapon',
        weaponType: 'bow',
        level: Math.floor(level),
        name,
        shots: bowShots,
        attacksPerSecond,
        critChance: 0.2,
        critDamage: 0.5,
        damage: Math.ceil(0.6 * level * BASE_WEAPON_DPS_PER_LEVEL / attacksPerSecond),
        chargeLevel: 3,
        speed: 1.5 * BASE_BULLET_SPEED,
        radius: BASE_BULLET_RADIUS,
        duration: BASE_BULLET_DURATION,
        enchantmentSlots: [],
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
        generateBullet(state: GameState, source: Hero, weapon: Weapon): Bullet {
            const critDamage = rollForCritDamage(state);
            return {
                x: source.x,
                y: source.y,
                radius: weapon.radius * source.attackChargeLevel,
                vx: weapon.speed * Math.cos(source.theta),
                vy: weapon.speed * Math.sin(source.theta),
                damage: Math.ceil(weapon.damage * getChargeDamage(state, source.attackChargeLevel) * source.damage * critDamage),
                chargeGain: 0.1,
                isCrit: critDamage > 1,
                isEnemyPiercing: (source.attackChargeLevel >= 2),
                source,
                expirationTime: state.fieldTime + weapon.duration,
                update: updateSimpleBullet,
                hitTargets: new Set(),
                armorShred: getArmorShred(state, source.attackChargeLevel),
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
        shots: swordShots,
        attacksPerSecond: BASE_ATTACKS_PER_SECOND,
        critChance: 0.05,
        critDamage: 0.5,
        damage: Math.ceil(level * BASE_WEAPON_DPS_PER_LEVEL / BASE_ATTACKS_PER_SECOND),
        chargeLevel: 2,
        speed: BASE_BULLET_SPEED,
        radius: Math.ceil(1.2 * BASE_BULLET_RADIUS),
        duration: BASE_BULLET_DURATION,
        enchantmentSlots: [],
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
        generateBullet(state: GameState, source: Hero, weapon: Weapon): Bullet {
            const critDamage = rollForCritDamage(state);
            return {
                x: source.x,
                y: source.y,
                vx: weapon.speed * Math.cos(source.theta + thetaOffset / source.attackChargeLevel / source.attackChargeLevel),
                vy: weapon.speed * Math.sin(source.theta + thetaOffset / source.attackChargeLevel / source.attackChargeLevel),
                damage: Math.ceil(weapon.damage * getChargeDamage(state, source.attackChargeLevel) * source.damage * critDamage),
                // Dagger gains charge 40% faster than average if every bullet hits.
                chargeGain: 0.02,
                isCrit: critDamage > 1,
                radius: weapon.radius + (source.attackChargeLevel - 1),
                source,
                expirationTime: state.fieldTime + weapon.duration,
                update: updateSimpleBullet,
                hitTargets: new Set(),
                armorShred: getArmorShred(state, source.attackChargeLevel),
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
        shots: daggerShots,
        attacksPerSecond: BASE_ATTACKS_PER_SECOND,
        critChance: 0.05,
        critDamage: 0.5,
        damage: Math.ceil(0.3 * level * BASE_WEAPON_DPS_PER_LEVEL / BASE_ATTACKS_PER_SECOND),
        chargeLevel: 2,
        speed: Math.ceil(BASE_BULLET_SPEED * 0.7),
        radius: BASE_BULLET_RADIUS,
        duration: BASE_BULLET_DURATION,
        enchantmentSlots: [],
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
        generateBullet(state: GameState, source: Hero, weapon: Weapon): Bullet {
            const speed = weapon.speed * (0.8 + 0.2 * source.attackChargeLevel);
            const critDamage = rollForCritDamage(state);
            return {
                x: source.x + offset * Math.cos(source.theta + Math.PI / 2),
                y: source.y + offset * Math.sin(source.theta + Math.PI / 2),
                vx: speed * Math.cos(source.theta),
                vy: speed * Math.sin(source.theta),
                damage: Math.ceil(weapon.damage * getChargeDamage(state, source.attackChargeLevel) * source.damage * critDamage),
                // Katana can gain charge almost 2x faster when piercing several enemies.
                chargeGain: 0.05,
                isCrit: critDamage > 1,
                isEnemyPiercing: true,
                radius: weapon.radius + (source.attackChargeLevel - 1),
                source,
                expirationTime: state.fieldTime + weapon.duration,
                update: updateSimpleBullet,
                hitTargets: new Set(),
                armorShred: getArmorShred(state, source.attackChargeLevel),
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
        shots: katanaShots,
        attacksPerSecond: BASE_ATTACKS_PER_SECOND,
        critChance: 0.05,
        critDamage: 1,
        damage: Math.ceil(0.5 * level * BASE_WEAPON_DPS_PER_LEVEL / BASE_ATTACKS_PER_SECOND),
        chargeLevel: 2,
        speed: BASE_BULLET_SPEED * 0.8,
        radius: BASE_BULLET_RADIUS,
        duration: BASE_BULLET_DURATION,
        enchantmentSlots: [],
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


export const morningStars: Weapon[] = [];
export const staffs: Weapon[] = [];

export const weaponTypes: WeaponType[] = [
    'bow',
    'dagger',
    'katana',
    'sword',
];

export const weaponTypeLabels: {[key in WeaponType]: string} = {
    bow: 'Bow',
    dagger: 'Dagger',
    katana: 'Katana',
    morningStar: 'Morning Star',
    staff: 'Staff',
    sword: 'Sword',
}

export const weaponsByType: {[key in WeaponType]: Weapon[]} = {
    bow: bows,
    dagger: daggers,
    katana: katanas,
    sword: swords,
    morningStar: morningStars,
    staff: staffs,
}

export const allWeapons: Weapon[][] = Object.values(weaponsByType);



// TODO: Add morning star, shot spins around the source and loops at the attack speed interval, pierces enemies
//       2 Charge levels increases radius by 16px each
// TODO: Add staff, single piercing shot that gets bigger but weaker with distance 120% damage at close range, down to 20% at max range
//       Add rendering function to bullets so we can make the staff shot fade as it gets weaker.
