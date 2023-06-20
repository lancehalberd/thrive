import { BASE_BULLET_SPEED } from 'app/constants';
import { getEnchantmentStrength } from 'app/enchantments';
import { playerTurret } from 'app/enemies/playerTurret';
import { addUniqueEnchantments } from 'app/uniqueEnchantmentHash';
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
        const turret = createEnemy(state.hero.x, state.hero.y, playerTurret, state.hero.level, state.hero.disc);
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

const waveBeam: UniqueEnchantment = {
    key: 'waveBeam',
    name: 'Wave Beam',
    enchantmentType: 'uniqueWeaponEnchantment',
    chance: COMMON_UNIQUE_RATE,
    getDescription(state: GameState, enchantment: UniqueEnchantmentInstance): string[] {
        return [
            'Attack with oscillating shots.',
        ];
    },
    modifyBullet(state: GameState, enchantment: UniqueEnchantmentInstance, bullet: Bullet): void {
        const amplitude = 45;
        bullet.amplitude = amplitude;
        bullet.frequency = 2;
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
        const doubleBullet = {...bullet};
        doubleBullet.amplitude = -amplitude;
        state.heroBullets.push(doubleBullet);
    },
};

const sharp: UniqueEnchantment = {
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


const globalUniqueWeaponEnchantments = [
    waveBeam,
    sharp,
    helix,
    tinkerer,
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
    const fakeEnemy = createEnemy(0, 0, playerTurret, state.hero.equipment.armor.level, undefined as any);
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
        console.log('onHit');
        const bullet = basicBullet(state, state.hero, state.hero.equipment.weapon);
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
    const fakeEnemy = createEnemy(0, 0, playerTurret, state.hero.equipment.armor.level, undefined as any);
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
        console.log('onHit');
        const bullet = basicBullet(state, state.hero, state.hero.equipment.weapon);
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

const globalUniqueArmorEnchantments = [
    reinforced,
    spongey,
    thorny,
    spiky,
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
    const enchantment  = Random.element(enchantments);
    if (rollWithMissBonus(state, enchantment.key, enchantment.chance * chanceMultiplier)) {
        addUniqueEnchantmentToItem(item, enchantment);
        return;
    }
}

export function addUniqueEnchantmentToItem(item: Equipment, enchantment: UniqueEnchantment): void {
    const instance = createUniqueEnchantmentInstance(enchantment, item.level);
    item.bonusEnchantmentSlots.push(instance);
}
