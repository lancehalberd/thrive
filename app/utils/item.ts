import { armorsByType } from 'app/armor';
import { weaponsByType } from 'app/weapons';
import { uniqueEnchantmentHash } from 'app/uniqueEnchantmentHash';

export function addEnchantmentSlot(item: Armor|Weapon): void {
    item.enchantmentSlots.push({enchantmentType: 'empty', value: 0})
}

export function resetArmor(armor: Armor): void {
    const defaultArmor = generateArmor(armor.armorType, armor.level);
    Object.assign(armor,  {
        ...defaultArmor,
        enchantmentSlots: armor.enchantmentSlots,
        bonusEnchantmentSlots: armor.bonusEnchantmentSlots,
    });
}

export function applyUniqueItemEnchantments(item: Equipment): void {
    for (const enchantment of [...item.enchantmentSlots, ...item.bonusEnchantmentSlots]) {
        if (enchantment.enchantmentType === 'uniqueArmorEnchantment' || enchantment.enchantmentType === 'uniqueWeaponEnchantment') {
            const definition = uniqueEnchantmentHash[enchantment.uniqueEnchantmentKey];
            if (item.type === 'armor') {
                definition.modifyArmor?.(enchantment, item);
            }
            if (item.type === 'weapon') {
                definition.modifyWeapon?.(enchantment, item);
            }
        }
    }
}

// Generates the base armor item for a given type+level.
export function generateArmor(armorType: ArmorType, level: number): Armor {
    const armorArray = armorsByType[armorType];
    let armorIndex = 0;
    for (;armorIndex < armorArray.length - 1; armorIndex++) {
        if (armorArray[armorIndex + 1].level > level) {
            break;
        }
    }
    const armor = {...armorArray[armorIndex]};
    for (let i = 0; i < 5 && armor.level < level; i++) {
        armor.level++;
        armor.name = armor.name + '+';
        armor.armor = Math.ceil(armor.armor * 1.1);
        armor.life = Math.ceil(armor.life * 1.1);
    }
    return armor;
}

export function resetWeapon(weapon: Weapon): void {
    const defaultWeapon = generateWeapon(weapon.weaponType, weapon.level);
    Object.assign(weapon,  {
        ...defaultWeapon,
        enchantmentSlots: weapon.enchantmentSlots,
        bonusEnchantmentSlots: weapon.bonusEnchantmentSlots,
    });
}

export function generateWeapon(weaponType: WeaponType, level: number): Weapon {
    let weaponArray = weaponsByType[weaponType];
    if (!weaponArray.length) {
        weaponArray = weaponsByType.sword;
    }
    let weaponIndex = 0;
    for (;weaponIndex < weaponArray.length - 1; weaponIndex++) {
        if (weaponArray[weaponIndex + 1].level > level) {
            break;
        }
    }

    const weapon = {...weaponArray[weaponIndex]};
    for (let i = 0; i < 5 && weapon.level < level; i++) {
        weapon.level++;
        weapon.name = weapon.name + '+';
        weapon.damage = Math.ceil(weapon.damage * 1.1);
    }
    return weapon;
}
