
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
    'speed': 0.3,
    'life': 0.5,
    'armor': 0.5,
    'potionEffect': 1,
};

function getEnchantmentStrength(level: number): number {
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

export function getEnchantmentBonusText(enchantmentType: EnchantmentType, value: number, value2?: number): string {
    let text = getEnchantmentPercentValue(enchantmentType, value)
    if (value2) {
        text += ' to ' + getEnchantmentPercentValue(enchantmentType, value2);
    }
    text += ' increased ' + enchantmentStatLabels[enchantmentType];
    return text;
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

export function getSpeedEnchantment(level: number): Enchantment {
    return {
        type: 'enchantment',
        name: 'Speed',
        level,
        weaponEnchantmentType: 'attackSpeed',
        armorEnchantmentType: 'speed',
        strength: getEnchantmentStrength(level),
    };
}

export function getPowerEnchantment(level: number): Enchantment {
    return {
        type: 'enchantment',
        name: 'Power',
        level,
        weaponEnchantmentType: 'damage',
        armorEnchantmentType: 'armor',
        strength: getEnchantmentStrength(level),
    };
}

export function getVigorEnchantment(level: number): Enchantment {
    return {
        type: 'enchantment',
        name: 'Vigor',
        level,
        weaponEnchantmentType: 'critDamage',
        armorEnchantmentType: 'life',
        strength: getEnchantmentStrength(level),
    };
}

export function getInsightEnchantment(level: number): Enchantment {
    return {
        type: 'enchantment',
        name: 'Insight',
        level,
        weaponEnchantmentType: 'critChance',
        armorEnchantmentType: 'potionEffect',
        strength: getEnchantmentStrength(level),
    };
}
