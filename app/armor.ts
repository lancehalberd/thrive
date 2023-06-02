function createLightArmor(level: number, name: string): Armor {
    return {
        type: 'armor',
        armorType: 'lightArmor',
        level: Math.floor(level),
        name,
        life: level * 10,
        armor: level,
        speedFactor: 1.2,
        enchantmentSlots: [],
    };
}

export const lightArmors: Armor[] = [
    createLightArmor(1, 'Wool Shirt'),
    createLightArmor(2, 'Hemp Frock'),
    createLightArmor(7, 'Linen Frock'),
    createLightArmor(11, 'Cotton Frock'),
    createLightArmor(17, 'Fur Coat'),
    createLightArmor(24, 'Cashmere Robe'),
    createLightArmor(32, 'Silk Robe'),
    createLightArmor(41, 'Angora Robe'),
    createLightArmor(51, 'Velvet Robe'),
    createLightArmor(62, 'Embroidered Robe'),
    createLightArmor(74, 'Sorcerous Vestment'),
    createLightArmor(87, 'Blessed Vestment'),
    createLightArmor(95, 'Divine Vestment'),
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
        enchantmentSlots: [],
    };
}

export const mediumArmors: Armor[] = [
    createMediumArmor(1, 'Cloth Tunic'),
    createMediumArmor(3, 'Leather Tunic'),
    createMediumArmor(8, 'Hide Tunic'),
    createMediumArmor(13, 'Leather Armor'),
    createMediumArmor(19, 'Studded Armor'),
    createMediumArmor(26, 'Hide Armor'),
    createMediumArmor(34, 'Carapace Armor'),
    createMediumArmor(43, 'Treated Armor'),
    createMediumArmor(53, 'Splint Armor'),
    createMediumArmor(64, 'Scale Armor'),
    createMediumArmor(76, 'Composite Armor'),
    createMediumArmor(89, 'Runed Armor'),
    createMediumArmor(95, 'Dragon Armor'),
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
        enchantmentSlots: [],
    };
}

export const heavyArmors: Armor[] = [
    createHeavyArmor(1, 'Lamellar'),
    createHeavyArmor(5, 'Bamboo Armor'),
    createHeavyArmor(10, 'Panoply'),
    createHeavyArmor(15, 'Plated Coat'),
    createHeavyArmor(21, 'Brigandine'),
    createHeavyArmor(28, 'Cuirass'),
    createHeavyArmor(36, 'Chainmail'),
    createHeavyArmor(45, 'Scalemail'),
    createHeavyArmor(55, 'Platemail'),
    createHeavyArmor(66, 'Half Plate'),
    createHeavyArmor(78, 'Full Plate'),
    createHeavyArmor(91, 'Adamantium Plate'),
    createHeavyArmor(95, 'Orichalcum Plate'),
];

export const allArmors: Armor[][] = [
    lightArmors,
    mediumArmors,
    heavyArmors,
];

export const armorTypeLabels: {[key in ArmorType]: string} = {
    lightArmor: 'Light Armor',
    mediumArmor: 'Armor',
    heavyArmor: 'Heavy Armor',
}
