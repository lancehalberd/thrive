import { uniqueEnchantmentHash } from 'app/uniqueEnchantmentHash';

export const enchantmentStrengthLabels = [
    'Failed',
    'Weak',
    'Minor',
    'Major',
    'Great',
    'Perfect',
];

export const enchantmentStatLabels: {[key in EnchantmentType]: string} = {
    'attackSpeed': 'Attack Speed',
    'critChance': 'Critical Strike Chance',
    'critDamage': 'Critical Strike Damage',
    'damage': 'Damage',
    'dropChance': 'Item Drop Chance',
    'dropLevel': 'Item Drop Level',
    'speed': 'Movement Speed',
    'life': 'Life',
    'armor': 'Armor',
    'potionEffect': 'Effect of Potions',
};
export const enchantmentStatScale: {[key in EnchantmentType]: number} = {
    'attackSpeed': 0.5,
    'critChance': 0.2,
    'critDamage': 1.0,
    'damage': 1.0,
    'dropChance': 0.1,
    'dropLevel': 2,
    'speed': 0.3,
    'life': 0.5,
    'armor': 0.5,
    'potionEffect': 1,
};

export function getEnchantmentStrength(level: number): 1|2|3|4|5 {
    if (level >= 80) {
        return 5;
    }
    if (level >= 50) {
        return 4;
    }
    if (level >= 30) {
        return 3;
    }
    if (level >= 15) {
        return 2;
    }
    return 1;
}

export function applyEnchantmentsToStats(state: GameState): void {
    for (const enchantment of state.hero.equipment.weapon.enchantmentSlots) {
        applyEnchantmentToStats(state, enchantment);
    }
    for (const enchantment of (state.hero.equipment.armor?.enchantmentSlots ?? [])) {
        applyEnchantmentToStats(state, enchantment);
    }
}

export function applyEnchantmentToStats(state: GameState, enchantment: ItemEnchantment): void {
    if (enchantment.enchantmentType === 'empty') {
        return;
    }
    if (enchantment.enchantmentType === 'uniqueArmorEnchantment' || enchantment.enchantmentType === 'uniqueWeaponEnchantment') {
        const definition = uniqueEnchantmentHash[enchantment.uniqueEnchantmentKey];
        definition.modifyHero?.(state, enchantment);
        return;
    }
    const effect = enchantment.value * enchantmentStatScale[enchantment.enchantmentType] / 100;
    switch (enchantment.enchantmentType) {
        case 'attackSpeed':
            state.hero.attacksPerSecond *= (1 + effect);
            return;
        case 'damage':
            state.hero.damage *= (1 + effect);
            return;
        case 'critChance':
            state.hero.critChance += effect;
            return;
        case 'critDamage':
            state.hero.critDamage += effect;
            return;
        case 'dropChance':
            state.hero.dropChance += effect;
            return;
        case 'dropLevel':
            state.hero.dropLevel += effect;
            return;
        case 'life':
            state.hero.maxLife = Math.round(state.hero.maxLife * (1 + effect));
            return;
        case 'armor':
            state.hero.armor = Math.round(state.hero.armor * (1 + effect));
            return;
        case 'speed':
            state.hero.speed *= (1 + effect);
            return;
        case 'potionEffect':
            state.hero.potionEffect *= (1 + effect);
            return;
    }
}

export function getEnchantmentPercentValue(enchantmentType: EnchantmentType, value: number): string {
    return Math.floor(value * enchantmentStatScale[enchantmentType]) + '%';
}

export function getEnchantmentBonusText(enchantmentType: EnchantmentType, value: number, value2?: number): string[] {
    let text = getEnchantmentPercentValue(enchantmentType, value)
    if (value2) {
        text += ' to ' + getEnchantmentPercentValue(enchantmentType, value2);
    }
    if (enchantmentType === 'dropLevel') {
        text += ' chance to drop higher level items';
    } else {
        text += ' increased ' + enchantmentStatLabels[enchantmentType];
    }
    return [text];
}

export function applyEnchantmentToEquipment(enchantment: Enchantment, item: Equipment): boolean {
    const enchantmentType = item.type === 'weapon'
        ? enchantment.weaponEnchantmentType
        : enchantment.armorEnchantmentType;
    for (const slot of item.enchantmentSlots) {
        if (slot.enchantmentType === 'empty') {
            slot.enchantmentType = enchantmentType;
            slot.value = 10 * enchantment.strength;
            return true;
        }
        if (slot.enchantmentType === enchantmentType) {
            if (slot.value < 10 * enchantment.strength) {
                slot.value = 10 * enchantment.strength;
                return true;
            } else if (slot.value < 20 * enchantment.strength) {
                slot.value = Math.min(slot.value + enchantment.strength, 20 * enchantment.strength);
                return true;
            }
            return false;
        }
    }
    return false;
}

export function getSpeedEnchantment(state: GameState, level: number): Enchantment {
    return {
        type: 'enchantment',
        name: 'Speed',
        level: applyBonusLevel(state, level),
        weaponEnchantmentType: 'attackSpeed',
        armorEnchantmentType: 'speed',
        strength: getEnchantmentStrength(level),
    };
}

export function getPowerEnchantment(state: GameState, level: number): Enchantment {
    return {
        type: 'enchantment',
        name: 'Power',
        level: applyBonusLevel(state, level),
        weaponEnchantmentType: 'damage',
        armorEnchantmentType: 'armor',
        strength: getEnchantmentStrength(level),
    };
}

export function getVigorEnchantment(state: GameState, level: number): Enchantment {
    return {
        type: 'enchantment',
        name: 'Vigor',
        level: applyBonusLevel(state, level),
        weaponEnchantmentType: 'critDamage',
        armorEnchantmentType: 'life',
        strength: getEnchantmentStrength(level),
    };
}

export function getInsightEnchantment(state: GameState, level: number): Enchantment {
    return {
        type: 'enchantment',
        name: 'Insight',
        level: applyBonusLevel(state, level),
        weaponEnchantmentType: 'critChance',
        armorEnchantmentType: 'potionEffect',
        strength: getEnchantmentStrength(level),
    };
}

export function getThiefEnchantment(state: GameState, level: number): Enchantment {
    return {
        type: 'enchantment',
        name: 'Thief',
        level: applyBonusLevel(state, level),
        weaponEnchantmentType: 'dropLevel',
        armorEnchantmentType: 'dropChance',
        strength: getEnchantmentStrength(level),
    };
}

function applyBonusLevel(state: GameState, level: number): number {
    let bonusLevelChance = state.hero.dropChance;
    while (Math.random() < bonusLevelChance) {
        level++;
        bonusLevelChance--;
    }
    return Math.min(100, level);
}
