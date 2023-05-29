function createLightArmor(level: number, name: string): Armor {
    return {
        type: 'armor',
        armorType: 'lightArmor',
        level: Math.floor(level),
        name,
        life: level * 10,
        armor: level,
        speedFactor: 1.2,
    };
}

export const lightArmors: Armor[] = [
    createLightArmor(1, 'Wool Shirt'),
    createLightArmor(2, 'Hemp Frock'),
    createLightArmor(5, 'Linen Frock'),
    createLightArmor(9, 'Cotton Frock'),
];

function createMediumArmor(level: number, name: string): Armor {
    return {
        type: 'armor',
        armorType: 'mediumArmor',
        level: Math.floor(level),
        name,
        life: level * 15,
        armor: Math.ceil(level * 1.5),
        speedFactor: 1,
    };
}

export const mediumArmors: Armor[] = [
    createMediumArmor(1, 'Cloth Tunic'),
    createMediumArmor(3, 'Leather Tunic'),
    createMediumArmor(6, 'Hide Tunic'),
    createMediumArmor(10, 'Leather Armor'),
];

function createHeavyArmor(level: number, name: string): Armor {
    return {
        type: 'armor',
        armorType: 'heavyArmor',
        level: Math.floor(level),
        name,
        life: level * 20,
        armor: Math.ceil(level * 2),
        speedFactor: 0.8,
    };
}

export const heavyArmors: Armor[] = [
    createHeavyArmor(1, 'Lamellar'),
    createHeavyArmor(4, 'Bamboo Armor'),
    createHeavyArmor(7, 'Panoply'),
    createHeavyArmor(11, 'Plated Coat'),
];

export const allArmors: Armor[][] = [
    lightArmors,
    mediumArmors,
    heavyArmors,
];
