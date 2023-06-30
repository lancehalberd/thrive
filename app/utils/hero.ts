import { guardian } from 'app/bosses/guardian';
import { spider } from 'app/bosses/spider';
import { giantClam } from 'app/enemies/clam';
import { megaSlime } from 'app/enemies/slime';
import { uniqueEnchantmentHash } from 'app/uniqueEnchantmentHash';
import { BASE_MAX_POTIONS, BASE_XP, BULLET_SHAVE_RADIUS } from 'app/constants';
import { applyEnchantmentsToStats } from 'app/enchantments';

export const masteryMap: {[key in string]: WeaponType} = {
    [guardian.name]: 'dagger',
    [spider.name]: 'katana',
    [giantClam.name]: 'sword',
    [megaSlime.name]: 'bow',
};


export function gainExperience(state: GameState, experience: number): void {
    const requiredExperience = getExperienceForNextLevel(state.hero.level);
    // You cannot gain more than 100% of the experience for the next level at once.
    state.hero.experience += Math.min(experience, requiredExperience);
    if (state.hero.experience >= requiredExperience) {
        state.hero.level++;
        state.hero.experience -= requiredExperience;
        setDerivedHeroStats(state);
        refillAllPotions(state);
    }
}

export function gainEquipmentExperience(state: GameState, type: ArmorType|WeaponType, sourceLevel: number, experience: number): void {
    const proficiency = getProficiency(state, type);
    const xpPenalty = Math.min(1, Math.max(0, (proficiency.level - sourceLevel) * 0.1));
    const requiredExperience = getExperienceForNextEquipmentLevel(proficiency.level);
    // You cannot gain more than 25% of the experience for the next weapon level at once.
    proficiency.experience += Math.min(Math.ceil(experience * (1 - xpPenalty)), requiredExperience / 4);
    if (proficiency.experience >= requiredExperience) {
        proficiency.level++;
        proficiency.experience -= requiredExperience;
        setDerivedHeroStats(state);
    }
}

export function getProficiency(state: GameState, type: ArmorType|WeaponType): Proficiency {
    return state.hero.proficiency[type] = state.hero.proficiency[type] || {level: 0, experience: 0};
}

export function getMastery(state: GameState, type: ArmorType|WeaponType): number {
    return state.hero.mastery[type] = state.hero.mastery[type] || 0;
}

export function getTotalProficiency(state: GameState, type: ArmorType|WeaponType): number {
    return getProficiency(state, type).level + getMastery(state, type);
}

export function gainItemExperience(state: GameState, item: Item): void {
    const experiencePenalty = Math.min(1, Math.max(0, (state.hero.level - item.level) * 0.1));
    const experience = BASE_XP * Math.pow(1.2, item.level) * 1.5;
    gainExperience(state, Math.ceil(experience * (1 - experiencePenalty)));
    if (item.type === 'armor') {
        gainEquipmentExperience(state, item.armorType, item.level, 2 * experience);
    }
    if (item.type === 'weapon') {
        gainEquipmentExperience(state, item.weaponType, item.level, 2 * experience);
    }
}

export function setDerivedHeroStats(state: GameState): void {
    state.hero.uniqueEnchantments = [];
    state.hero.flags = {};

    // This must be calculated before anything that uses weapon proficiency which is derived in part from these numbers.
    state.hero.mastery = {};
    for (const bossName of Object.keys(state.hero.bossRecords)) {
        const weaponType = masteryMap[bossName];
        const bonus = 5 + Math.floor(state.hero.bossRecords[bossName]! / 5);
        state.hero.mastery[weaponType] = (state.hero.mastery[weaponType] || 0) + bonus;
    }

    const {armor, weapon} = state.hero.equipment;
    const weaponLevel = weapon.level;
    const proficiency = getTotalProficiency(state, weapon.weaponType);
    state.hero.damage = Math.pow(1.05, state.hero.level - 1 + proficiency);
    state.hero.attacksPerSecond = 1 + 0.01 * state.hero.level + 0.01 * proficiency;
    // If weapon level is higher than your proficiency, attack speed is reduced down to a minimum of 10% base attack speed.
    const proficiencyDefecit = weaponLevel - proficiency;
    if (proficiencyDefecit > 0) {
        state.hero.attacksPerSecond = state.hero.attacksPerSecond * Math.max(0.1, 0.95 ** proficiencyDefecit);
    }
    const lifePercentage = state.hero.life / state.hero.maxLife;
    const armorPercentage = state.hero.baseArmor ? (state.hero.armor / state.hero.baseArmor) : 0;
    state.hero.maxLife = 20 * state.hero.level;
    state.hero.baseArmor = 0;
    state.hero.speed = 250;
    state.hero.potionEffect = 1;
    state.hero.dropChance = 0;
    state.hero.dropLevel = 0;

    state.hero.maxLife += armor.life;
    state.hero.baseArmor += armor.armor;
    state.hero.speed *= armor.speedFactor;


    // Bow gives 0.1% -> 10% increased crit chance
    state.hero.critChance = getTotalProficiency(state, 'bow') * 0.001;
    // Dagger gives +0.01 -> 1 increased base attacks per second
    state.hero.attacksPerSecond += getTotalProficiency(state, 'dagger') * 0.01;
    // Katana gives 1% -> 100% increased crit damage
    state.hero.critDamage = getTotalProficiency(state, 'katana') * 0.01;
    // Morning Star gives +0.01 -> 1 increased armor shred effect
    state.hero.armorShredEffect = 1 + getTotalProficiency(state, 'morningStar') * 0.01;
    // Staff gives +0.01 -> 1 increased charge damage
    state.hero.chargeDamage = getTotalProficiency(state, 'wand') * 0.01;
    // Sword gives 1% -> 100% increased damage
    state.hero.damage *= (1 + getTotalProficiency(state, 'sword') * 0.01);

    state.hero.maxLife *= (1 + getTotalProficiency(state, 'mediumArmor') * 0.01);
    state.hero.baseArmor *= (1 + getTotalProficiency(state, 'heavyArmor') * 0.01);

    // Enchantments are applied last to stats.
    applyEnchantmentsToStats(state);

    // Make sure updating stats doesn't change the hero's life percentage beyond rounding it.
    state.hero.maxLife = Math.ceil(state.hero.maxLife);
    state.hero.life = Math.round(lifePercentage * state.hero.maxLife);
    state.hero.armor = armorPercentage * state.hero.baseArmor;

    const allSlots = [
        ...armor.enchantmentSlots,
        ...armor.bonusEnchantmentSlots,
        ...weapon.enchantmentSlots,
        ...weapon.bonusEnchantmentSlots,
    ];
    for (const enchantment of allSlots) {
        if (enchantment.enchantmentType === 'uniqueArmorEnchantment' || enchantment.enchantmentType === 'uniqueWeaponEnchantment') {
            state.hero.uniqueEnchantments.push(enchantment);
            const definition = uniqueEnchantmentHash[enchantment.uniqueEnchantmentKey];
            for (const flag of (definition.flags ?? [])) {
                state.hero.flags[flag] = true;
            }
            definition.modifyHero?.(state, enchantment);
        }
    }
}

export function getExperienceForNextLevel(currentLevel: number): number {
    // This is:
    // ~5 kills for 1 -> 2
    // ~16 kills for 10 -> 11
    // 30 kills for 20 -> 21
    // 100 kills for 50 -> 51
    // 125 kills for 60 -> 61
    // 200 kills for 75 -> 76
    // 250 kills for 80 -> 81
    // 500 kills for 90 -> 91
    // 1000 kills for 95 -> 96
    // 2500 kills for 98 -> 99
    // 5000 kills for 99 -> 100
    const averageKills = Math.min(50, 4 + currentLevel) * 100 / (100 - currentLevel);
    const xpPerKill = Math.ceil(BASE_XP * Math.pow(1.2, currentLevel - 1));
    return averageKills * xpPerKill;
}
// @ts-ignore-next-line
window['getExperienceForNextLevel'] = getExperienceForNextLevel;

export function getExperienceForNextEquipmentLevel(currentLevel: number): number {
    const averageKills = Math.min(20, 5 + currentLevel) * 100 / (100 - currentLevel);
    const xpPerKill = Math.ceil(BASE_XP * Math.pow(1.2, currentLevel));
    return averageKills * xpPerKill;
}

export function refillAllPotions(state: GameState): void {
    state.hero.life = state.hero.maxLife;
    state.hero.potions = BASE_MAX_POTIONS;
    state.hero.armor = Math.max(state.hero.armor, state.hero.baseArmor);
}


export function getMaxChargeLevel(state: GameState): number {
    const proficiency = getTotalProficiency(state, state.hero.equipment.weapon.weaponType);
    return state.hero.equipment.weapon.chargeLevel + Math.floor(proficiency / 25);
}

export function getHeroShaveRadius(state: GameState): number {
    const bonus = (1 + getTotalProficiency(state, 'lightArmor') / 100);
    let p = (state.hero.attackChargeLevel > 1)
        ? 0
        : 1 - (state.hero.chargingLevel - 1) / (getMaxChargeLevel(state) - 1);
    if (state.hero.flags.noShaveShrink) {
        p = 1;
    }
    if (state.hero.equipment.armor.armorType === 'lightArmor') {
        return p * 1.25 * BULLET_SHAVE_RADIUS * bonus;
    }
    if (state.hero.equipment.armor.armorType === 'heavyArmor') {
        return p * 0.75 * BULLET_SHAVE_RADIUS * bonus;
    }
    return p * BULLET_SHAVE_RADIUS * bonus;
}
