import { armorTypes } from 'app/armor';
import { BASE_DROP_CHANCE } from 'app/constants';
import { checkToAddGlobalUniqueEnchantments } from 'app/uniqueEnchantments';
import { gainItemExperience } from 'app/utils/hero';
import { addEnchantmentSlot, applyUniqueItemEnchantments, generateArmor, generateWeapon} from 'app/utils/item';
import { rollWithMissBonus } from 'app/utils/rollWithMissBonus';
import {
    renderArmorShort,
    renderArmorLong,
    renderEnchantmentLong,
    renderEnchantmentShort,
    renderWeaponShort,
    renderWeaponLong,
} from 'app/render/renderInventory';
import { weaponTypes } from 'app/weapons';
import Random  from 'app/utils/Random';


function rollEnchantmentSlots(state: GameState, item: Armor|Weapon): void {
    item.enchantmentSlots = [];
    item.bonusEnchantmentSlots = [];
    addEnchantmentSlot(item);
    if (item.level >= 5 && rollWithMissBonus(state, 'twoSockets', 0.1)) {
        addEnchantmentSlot(item);
        if (item.level >= 20 && rollWithMissBonus(state, 'threeSockets', 0.1)) {
            addEnchantmentSlot(item);
            if (item.level >= 50 && rollWithMissBonus(state, 'fourSockets', 0.1)) {
                addEnchantmentSlot(item);
            }
        }
    }
}
// Rolls for a randomly generated armor item given type+level.
export function rollArmor(state: GameState, armorType: ArmorType, level: number, uniqueMultiplier: number): Armor {
    const armor = generateArmor(armorType, level);
    rollEnchantmentSlots(state, armor);
    checkToAddGlobalUniqueEnchantments(state, armor, uniqueMultiplier);
    applyUniqueItemEnchantments(armor);
    return armor;
}
// Rolls for a randomly generated armor item given type+level.
export function rollWeapon(state: GameState, weaponType: WeaponType, level: number, uniqueMultiplier: number): Weapon {
    const weapon = generateWeapon(weaponType, level);
    rollEnchantmentSlots(state, weapon);
    checkToAddGlobalUniqueEnchantments(state, weapon, uniqueMultiplier);
    applyUniqueItemEnchantments(weapon);
    return weapon;
}

export function checkToDropBasicLoot(state: GameState, source: Enemy): void {
    if (rollWithMissBonus(state, 'dropItem', (source.definition.dropChance ?? BASE_DROP_CHANCE) + state.hero.dropChance)) {
        let targetLevel = source.level;
        let bonusLevelChance = state.hero.dropChance;
        if (bonusLevelChance > 0) {
            while (rollWithMissBonus(state, 'playerBonusItemLevel', bonusLevelChance)) {
                targetLevel++;
                bonusLevelChance--;
            }
        }
        while (rollWithMissBonus(state, 'defaultBonusItemLevel', 0.1)) {
            targetLevel++;
        }
        targetLevel = Math.min(100, targetLevel);
        if (rollWithMissBonus(state, 'dropArmor', 0.25)) {
            dropArmorLoot(state, source, targetLevel);
        } else {
            dropWeaponLoot(state, source, targetLevel);
        }
    }
}


export function dropArmorLoot(state: GameState, source: Enemy, level: number): void {
    if (!source.disc) {
        return;
    }
    const armorType = Random.element(armorTypes);
    const armor = rollArmor(state, armorType, level, source.definition.uniqueMultiplier ?? 1);
    if (!armor) {
        return;
    }

    source.disc.loot.push({
        type: 'armor',
        x: source.x,
        y: source.y,
        disc: source.disc,
        radius: 12,
        armor,
        activate(this: ArmorLoot, state: GameState): void {
            state.hero.armors.push(this.armor);
        },
        render(this: ArmorLoot, context: CanvasRenderingContext2D, state: GameState): void {
            if (this === state.activeLoot) {
                renderArmorLong(context, this.x, this.y, this.armor);
            } else {
                renderArmorShort(context, this.x, this.y, this.armor);
            }
        },
        sell(this: ArmorLoot): void {
            gainItemExperience(state, this.armor);
        }
    });
}


export function dropWeaponLoot(state: GameState, source: Enemy, level: number): void {
    if (!source.disc) {
        return;
    }
    const weaponType = Random.element(weaponTypes);
    const weapon = rollWeapon(state, weaponType, level, source.definition.uniqueMultiplier ?? 1);
    if (!weapon) {
        return;
    }
    source.disc.loot.push({
        type: 'weapon',
        x: source.x,
        y: source.y,
        disc: source.disc,
        radius: 12,
        weapon,
        activate(this: WeaponLoot, state: GameState): void {
            state.hero.weapons.push(this.weapon);
        },
        render(this: WeaponLoot, context: CanvasRenderingContext2D, state: GameState): void {
            if (this === state.activeLoot) {
                renderWeaponLong(context, this.x, this.y, this.weapon);
            } else {
                renderWeaponShort(context, this.x, this.y, this.weapon);
            }
        },
        sell(this: WeaponLoot): void {
            gainItemExperience(state, this.weapon);
        }
    });
}

export function dropEnchantmentLoot(state: GameState, disc: Disc, {x, y}: Point, enchantment: Enchantment): void {
    if (!disc) {
        return;
    }
    disc.loot.push({
        type: 'enchantment',
        disc,
        x,
        y,
        radius: 12,
        enchantment,
        activate(this: EnchantmentLoot, state: GameState): void {
            state.hero.enchantments.push(this.enchantment);
        },
        render(this: EnchantmentLoot, context: CanvasRenderingContext2D, state: GameState): void {
            if (this === state.activeLoot) {
                renderEnchantmentLong(context, this.x, this.y, this.enchantment);
            } else {
                renderEnchantmentShort(context, this.x, this.y, this.enchantment);
            }
        },
        sell(this: EnchantmentLoot): void {
            gainItemExperience(state, this.enchantment);
        }
    });
}
