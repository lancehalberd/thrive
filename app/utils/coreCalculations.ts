export function rollForCritDamage(state: GameState, additionalCritchance: number = 0): number {
    const weapon = state.hero.equipment.weapon;
    const isCrit = Math.random() < additionalCritchance + state.hero.critChance + weapon.critChance;
    if (!isCrit) {
        return 1;
    }
    return 1 + state.hero.critDamage + weapon.critDamage;
}

export function getBaseWeaponDpsForLevel(level: number): number {
    return level * window.BASE_WEAPON_DPS_PER_LEVEL * (window.BASE_WEAPON_DPS_PER_LEVEL_MULTIPLIER ** level);
}
export function getHeroLevelDamageBonus(level: number): number {
    return 1.04 ** (level - 1);
}
export function getHeroWeaponProficiencyLevelDamageBonus(level: number): number {
    return 1.04 ** level;
}

export function getBaseEnemyExperience(level: number): number {
    return Math.ceil(window.BASE_XP * Math.pow(1.2, level - 1));
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
    return Math.ceil(averageKills * getBaseEnemyExperience(currentLevel));
}
// @ts-ignore-next-line
window['getExperienceForNextLevel'] = getExperienceForNextLevel;

export function getExperienceForNextEquipmentLevel(currentLevel: number): number {
    const averageKills = Math.min(20, 5 + currentLevel) * 100 / (100 - currentLevel);
    const xpPerKill = Math.ceil(window.BASE_XP * Math.pow(1.2, currentLevel));
    return averageKills * xpPerKill;
}
