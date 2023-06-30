import { BASE_BULLET_SPEED } from 'app/constants';
import { getEnchantmentStrength } from 'app/enchantments';
import { playerTurret } from 'app/enemies/playerTurret';
import { addUniqueEnchantments } from 'app/uniqueEnchantmentHash';
import { updateSimpleBullet, updateEnemySeekingBullet, updateSourceSeekingBullet, updateReturnBullet }  from 'app/utils/bullet';
import { abbreviate } from 'app/utils/combat';
import { createEnemy } from 'app/utils/enemy';
import { rollWithMissBonus } from 'app/utils/rollWithMissBonus';
import Random from 'app/utils/Random';
import { basicBullet } from 'app/weapons';

const COMMON_UNIQUE_RATE = 0.1;
const UNCOMMON_UNIQUE_RATE = 0.01;
const RARE_UNIQUE_RATE = 0.001;


const tinkerer: UniqueEnchantment = {
    key: 'tinkerer',
    name: 'Tinkerer',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: UNCOMMON_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Charged attacks creates turrets instead.',
        ];
    },
    onActivateCharge(state: GameState, enchantment: UniqueEnchantmentInstance): boolean {
        const turret = createEnemy(state, state.hero.x, state.hero.y, playerTurret, state.hero.level, state.hero.disc);
        turret.theta = state.hero.theta;
        // This should be 2x charge attack duration
        turret.params.duration = 4000;
        turret.baseColor = 'blue';
        // Charge level is reduced by 1 each time a turret is placed.
        state.hero.chargingLevel--;
        // Return true to disable default charge behavior.
        return true;
    },
};

const wave: UniqueEnchantment = {
    key: 'wave',
    name: 'Wave',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: COMMON_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            '25% increased attack speed.',
            'Attack with oscillating shots.',
        ];
    },
    modifyHero(state: GameState, enchantment: UniqueEnchantmentInstance): void {
        state.hero.attacksPerSecond *= 1.25;
    },
    modifyBullet(state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet): void {
        const amplitude = 20;
        bullet.amplitude = amplitude;
        bullet.frequency = 4;
        /*bullet.vx *= 0.9;
        bullet.vy *= 0.9;
        bullet.duration *= 1.1;*/
    },
};

const helix: UniqueEnchantment = {
    key: 'helix',
    name: 'Helix',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: RARE_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Attack with helix shots.',
        ];
    },
    modifyBullet(state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet): void {
        const amplitude = 45;
        bullet.amplitude = amplitude;
        bullet.frequency = 2;
        //bullet.vx *= 0.9;
        //bullet.vy *= 0.9;
        //bullet.duration *= 1.1;
        const doubleBullet = {...bullet, hitTargets: new Set()};
        doubleBullet.amplitude = -amplitude;
        state.heroBullets.push(doubleBullet);
    },
};

const vicious: UniqueEnchantment = {
    key: 'vicious',
    name: 'Vicious',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: UNCOMMON_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Weapon has +' + 40 * enchantment.tier + ' base damage.',
        ];
    },
    modifyWeapon(enchantment: UniqueEnchantmentInstance, weapon: Weapon): void {
        weapon.damage  += 40 * enchantment.tier;
    }
};

const kiting: UniqueEnchantment = {
    key: 'kiting',
    name: 'Kiting',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: UNCOMMON_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Shots last longer and slow to a stop and deal damage over time.',
        ];
    },
    modifyWeapon(enchantment: UniqueEnchantmentInstance, weapon: Weapon): void {
        //weapon.speed *= 1.5;
        weapon.range *= 1.5;
        weapon.radius *= 1.5;
    },
    modifyBullet(state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet): void {
        bullet.friction = 0.98;
        bullet.duration += 1500;
        //bullet.vx *= 1.75;
        //bullet.vy *= 1.75;
        bullet.damageOverTime = 4 * bullet.damage;
        bullet.damageOverTimeLimit = state.hero.equipment.weapon.damageOverTimeStackSize * bullet.damageOverTime;
    },
};


function updateBoomeringBullet(state: GameState, bullet: Bullet): void {
    updateSimpleBullet(state, bullet);
    if (bullet.time >= bullet.duration / 2) {
        bullet.damage *= 3;
        bullet.vx = -bullet.vx;
        bullet.vy = -bullet.vy;
        bullet.update = updateSourceSeekingBullet;
    }
}
const boomerang: UniqueEnchantment = {
    key: 'boomerang',
    name: 'Boomerang',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: UNCOMMON_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Shots last longer and reverse direction.',
            'Returning shots deal tripe damage'
        ];
    },
    modifyBullet(state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet): void {
        bullet.update = updateBoomeringBullet;
        bullet.duration *= 1.5;
    },
    invalidTypes: ['morningStar'],
};
const reversing: UniqueEnchantment = {
    key: 'reversing',
    name: 'Reversing',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: UNCOMMON_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Shots last longer and reverse direction.',
        ];
    },
    modifyBullet(state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet): void {
        bullet.update = updateReturnBullet;
        bullet.duration *= 1.5;
    },
    invalidTypes: ['morningStar'],
};

const vacuum: UniqueEnchantment = {
    key: 'vacuum',
    name: 'Vacuum',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: UNCOMMON_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Shots spawn at range and move backwards.',
        ];
    },
    modifyBullet(state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet): void {
        const multiplier = bullet.duration / 1000;
        bullet.baseX = bullet.x = bullet.x + bullet.vx * multiplier;
        bullet.baseY = bullet.y = bullet.y + bullet.vy * multiplier;
        bullet.vx *= -1.5;
        bullet.vy *= -1.5;
        if (bullet.theta !== undefined && bullet.vTheta !== undefined) {
            bullet.theta = bullet.theta + bullet.vTheta * multiplier;
            bullet.vTheta *= -1.5;
        } else {
            bullet.update = updateSourceSeekingBullet;
        }
    },
    invalidTypes: ['morningStar'],
};
const seeking: UniqueEnchantment = {
    key: 'seeking',
    name: 'Seeking',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: RARE_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Shots seek the nearest enemy.',
        ];
    },
    modifyBullet(state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet): void {
        bullet.update = updateEnemySeekingBullet;
    },
    invalidTypes: ['morningStar'],
};

const acid: UniqueEnchantment = {
    key: 'acid',
    name: 'Acid',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: RARE_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Shots deal 50% damage.',
            'Shots create a damaging pool.',
        ];
    },
    modifyBullet(state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet): void {
        /*bullet.warningTime = 2 * bullet.duration / 3;
        bullet.duration = bullet.warningTime + 1000;
        bullet.damageOverTime = bullet.damage;
        bullet.update = updateAcidBullet;*/
        bullet.damage /= 2;
        bullet.onHitOrDeath = (state: GameState, bullet: Bullet) => {
            const explosion = {
                ...bullet,
                time: 0,
                damageOverTime: 3 * bullet.damage,
                radius: 10,
                duration: 1000,
                vx: 0,
                vy: 0,
                hitTargets: new Set(),
                onHitOrDeath: undefined,
                update(state: GameState, bullet: Bullet) {
                    bullet.radius += 2;
                },
            };
            state.heroBullets.push(explosion);
        };
    },
};

const explosive: UniqueEnchantment = {
    key: 'explosive',
    name: 'Explosive',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: UNCOMMON_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Shots explode dealing 50% of damage as AOE damage.',
            'Shots deal 50% less damage for each enemy hit.',
        ];
    },
    modifyBullet(state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet): void {
        // bullet.warningTime = bullet.duration - 5 * FRAME_LENGTH;
        // bullet.update = updateExplosiveBullet;
        bullet.onHitOrDeath = (state: GameState, bullet: Bullet) => {
            bullet.damage /= 2;
            const explosion = {
                ...bullet,
                time: 0,
                radius: 10,
                duration: 100,
                isEnemyPiercing: true,
                vx: 0,
                vy: 0,
                hitTargets: new Set(),
                onHitOrDeath: undefined,
                update(state: GameState, bullet: Bullet) {
                    bullet.radius *= 1.5;
                },
            };
            state.heroBullets.push(explosion);
        };
    },
};

const laser: UniqueEnchantment = {
    key: 'laser',
    name: 'Laser',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: RARE_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Attacks are very rapid but have reduced range and deal damage over time.',
        ];
    },
    modifyHero(state: GameState, enchantment: UniqueEnchantmentInstance): void {
        state.hero.attacksPerSecond *= 5;
    },
    modifyWeapon(enchantment: UniqueEnchantmentInstance, weapon: Weapon): void {
        weapon.range /= 3;
    },
    modifyBullet(state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet): void {
        bullet.damageOverTime = 20 * bullet.damage;
        bullet.damageOverTimeLimit = state.hero.equipment.weapon.damageOverTimeStackSize * bullet.damageOverTime;
    },
};


const trap: UniqueEnchantment = {
    key: 'trap',
    name: 'Trap',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: RARE_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Attacks with traps that trigger multiple shots on hit.',
        ];
    },
    /*modifyWeapon(enchantment: UniqueEnchantmentInstance, weapon: Weapon): void {
        //weapon.speed *= 1.5;
        weapon.range *= 1.5;
        weapon.radius *= 1.5;
    },*/
    modifyBullet(state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet): void {
        const baseDamage = bullet.damage;
        const baesIsEnemyPiercing = bullet.isEnemyPiercing;
        const baseArmorShred = bullet.armorShred;
        bullet.damage = 0;
        bullet.armorShred = 0;
        bullet.isEnemyPiercing = false;
        bullet.friction = 0.98;
        bullet.duration += 2000;
        bullet.onHit = function (state: GameState, bullet: Bullet) {
            const baseBullet = {
                ...bullet,
                damage: baseDamage,
                isEnemyPiercing: baesIsEnemyPiercing,
                armorShred: baseArmorShred,
                friction: 0,
                duration: 500,
                time: 0,
                onHit: undefined,
                update: updateSimpleBullet,
            };
            for (let i = 0; i < 6; i++) {
                const theta = 2 * Math.PI * i / 6;
                const dx = Math.cos(theta), dy = Math.sin(theta);
                state.heroBullets.push({
                    ...baseBullet,
                    x: bullet.baseX + 250 * dx,
                    y: bullet.baseY + 250 * dy,
                    baseX: bullet.baseX + 250 * dx,
                    baseY: bullet.baseY + 250 * dy,
                    vx: -dx * BASE_BULLET_SPEED,
                    vy: -dy * BASE_BULLET_SPEED,
                    hitTargets: new Set(),
                });
            }
        }
    },
};

const globalUniqueWeaponEnchantments = [
    acid,
    boomerang,
    explosive,
    helix,
    kiting,
    laser,
    reversing,
    seeking,
    tinkerer,
    trap,
    vacuum,
    vicious,
    wave,
];

const reinforced: UniqueEnchantment = {
    key: 'reinforced',
    name: 'Reinforced',
    enchantmentType: 'uniqueArmorEnchantment',
    chance: UNCOMMON_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Armor has +' + 4 * enchantment.tier + ' base armor.',
        ];
    },
    modifyArmor(enchantment: UniqueEnchantmentInstance, armor: Armor): void {
        armor.armor  += 4 * enchantment.tier;
    }
};
const spongey: UniqueEnchantment = {
    key: 'spongey',
    name: 'Spongey',
    enchantmentType: 'uniqueArmorEnchantment',
    chance: UNCOMMON_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Armor has +' + 20 * enchantment.tier * (enchantment.tier + 1) / 2 + ' base life.',
        ];
    },
    modifyArmor(enchantment: UniqueEnchantmentInstance, armor: Armor): void {
        armor.life  += 20 * enchantment.tier * (enchantment.tier + 1) / 2;
    }
};
function getThornDamage(state: GameState, enchantment: UniqueEnchantmentInstance): number {
    const fakeEnemy = createEnemy(state, 0, 0, playerTurret, state.hero.equipment.armor.level, undefined as any);
    return Math.ceil(fakeEnemy.maxLife / 20);
}
const thorny: UniqueEnchantment = {
    key: 'thorny',
    name: 'Thorny',
    enchantmentType: 'uniqueArmorEnchantment',
    chance: COMMON_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Retaliate on hit for ' + abbreviate(getThornDamage(state, enchantment)) + ' damage',
        ];
    },
    onHit(state: GameState, enchantment: UniqueEnchantmentInstance): void {
        const bullet = basicBullet(state, state.hero, state.hero.equipment.weapon, state.mouse);
        bullet.radius = 20;
        bullet.damage = getThornDamage(state, enchantment);
        bullet.chargeGain = 0;
        bullet.armorShred = 0.05;
        bullet.isEnemyPiercing = true;
        bullet.isCrit = true;
        const range = 300;
        const speed = BASE_BULLET_SPEED;
        bullet.duration = 1000 * range / speed;
        for (let i = 0; i < 12; i++) {
            const theta = 2 * Math.PI * i / 12;
            state.heroBullets.push({
                ...bullet,
                vx: speed * Math.cos(theta),
                vy: speed * Math.sin(theta),
            });
        }
    }
};
function getSpikeDamage(state: GameState, enchantment: UniqueEnchantmentInstance): number {
    const fakeEnemy = createEnemy(state, 0, 0, playerTurret, state.hero.equipment.armor.level, undefined as any);
    return Math.ceil(fakeEnemy.maxLife / 5);
}
const spiky: UniqueEnchantment = {
    key: 'spiky',
    name: 'Spiky',
    enchantmentType: 'uniqueArmorEnchantment',
    chance: RARE_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Retaliate on hit for ' + abbreviate(getSpikeDamage(state, enchantment)) + ' damage',
        ];
    },
    onHit(state: GameState, enchantment: UniqueEnchantmentInstance): void {
        const bullet = basicBullet(state, state.hero, state.hero.equipment.weapon, state.mouse);
        bullet.radius = 20;
        bullet.damage = getSpikeDamage(state, enchantment);
        bullet.chargeGain = 0;
        bullet.armorShred = 0.05;
        bullet.isEnemyPiercing = true;
        bullet.isCrit = true;
        const range = 300;
        const speed = BASE_BULLET_SPEED;
        bullet.duration = 1000 * range / speed;
        for (let i = 0; i < 12; i++) {
            const theta = 2 * Math.PI * i / 12;
            state.heroBullets.push({
                ...bullet,
                vx: speed * Math.cos(theta),
                vy: speed * Math.sin(theta),
            });
        }
    }
};

const paladin: UniqueEnchantment = {
    key: 'paladin',
    name: 'Paladin',
    enchantmentType: 'uniqueArmorEnchantment',
    chance: RARE_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Shaving bullets restores 2% of missing health',
        ];
    },
    onShave(state: GameState, enchantment: UniqueEnchantmentInstance): void {
        const missingHealth = state.hero.maxLife - state.hero.life;
        state.hero.life = Math.min(state.hero.maxLife, Math.ceil(state.hero.life + missingHealth * 0.02));
    },
    flags: ['noShaveShrink', 'noShaveCharge'],
};

const voidEnchantment: UniqueEnchantment = {
    key: 'void',
    name: 'Void',
    enchantmentType: 'uniqueArmorEnchantment',
    chance: RARE_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Shaved bullets are destroyed',
        ];
    },
    onShave(state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet): void {
        bullet.duration = 0;
    },
    flags: ['noShaveShrink', 'noShaveCharge'],
};

const globalUniqueArmorEnchantments = [
    paladin,
    reinforced,
    spiky,
    spongey,
    thorny,
    voidEnchantment,
];

addUniqueEnchantments(globalUniqueArmorEnchantments);
addUniqueEnchantments(globalUniqueWeaponEnchantments);

function createUniqueEnchantmentInstance(enchantment: UniqueEnchantment, level: number): UniqueArmorEnchantmentInstance | UniqueWeaponEnchantmentInstance {
    return {
        uniqueEnchantmentKey: enchantment.key,
        enchantmentType: enchantment.enchantmentType,
        tier: getEnchantmentStrength(level),
    };
}

export function checkToAddGlobalUniqueEnchantments(state: GameState, item: Equipment, chanceMultiplier = 1): void {
    if (item.type === 'weapon') {
        checkToAddSpecifiedUniqueEnchantments(state, item, globalUniqueWeaponEnchantments, chanceMultiplier);
    } else if (item.type === 'armor') {
        checkToAddSpecifiedUniqueEnchantments(state, item, globalUniqueArmorEnchantments, chanceMultiplier);
    }
}

export function checkToAddSpecifiedUniqueEnchantments(state: GameState, item: Equipment, enchantments: UniqueEnchantment[], chanceMultiplier = 1): void {
    const enchantment  = Random.element(enchantments.filter(
        e => !e.invalidTypes?.includes(item.type === 'weapon' ? item.weaponType : item.armorType)
    ));
    if (!enchantment) {
        return;
    }
    const levelMultiplier = 10 - 9 * item.level / 100;
    if (rollWithMissBonus(state, enchantment.key, enchantment.chance * chanceMultiplier * levelMultiplier)) {
        addUniqueEnchantmentToItem(item, enchantment);
        return;
    }
}

export function addUniqueEnchantmentToItem(item: Equipment, enchantment: UniqueEnchantment): void {
    const instance = createUniqueEnchantmentInstance(enchantment, item.level);
    item.bonusEnchantmentSlots.push(instance);
}
