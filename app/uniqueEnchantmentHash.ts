
export const uniqueEnchantmentHash: {[key: string]: UniqueEnchantment} = {};

export function addUniqueEnchantment(enchantment: UniqueEnchantment): void {
    if (uniqueEnchantmentHash[enchantment.key]) {
        console.error('Unique Enchantment Key collission:', enchantment.key);
    }
    uniqueEnchantmentHash[enchantment.key] = enchantment;
}

export function addUniqueEnchantments(enchantments: UniqueEnchantment[]): void {
    for (const enchantment of enchantments) {
        addUniqueEnchantment(enchantment);
    }
}
