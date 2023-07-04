import { GAME_KEY } from 'app/constants';
import { applyEnchantmentToEquipment } from 'app/enchantments';
import { isPointInRect } from 'app/utils/geometry';
import { gainItemExperience, setDerivedHeroStats } from 'app/utils/hero';
import { wasGameKeyPressed } from 'app/utils/userInput';

const slotSpacing = window.SLOT_SIZE + window.SLOT_PADDING;

const weaponSlot: InventorySlot = {
    x: window.SLOT_PADDING,
    y: window.CANVAS_HEIGHT - slotSpacing,
    w: window.SLOT_SIZE,
    h: window.SLOT_SIZE,
};

const armorSlot: InventorySlot = {
    x: window.SLOT_PADDING,
    y: window.CANVAS_HEIGHT - 2 * slotSpacing,
    w: window.SLOT_SIZE,
    h: window.SLOT_SIZE,
};

export function getInventorySlots(state: GameState): InventorySlot[] {
    const slots: InventorySlot[] = [
        {
            ...weaponSlot,
            item: state.hero.equipment.weapon,
        },
        {
            ...armorSlot,
            item: state.hero.equipment.armor,
        },
    ];
    let slotCount = state.paused ? 10 : 4;
    let y = window.CANVAS_HEIGHT - 3 * slotSpacing;
    for (let i = 0; i < slotCount; i++) {
        const x = window.CANVAS_WIDTH - (i + 1) * slotSpacing;
        slots.push({
            x,
            y,
            w: window.SLOT_SIZE,
            h: window.SLOT_SIZE,
            item: state.hero.enchantments[i],
        });
        slots.push({
            x,
            y: y + slotSpacing,
            w: window.SLOT_SIZE,
            h: window.SLOT_SIZE,
            item: state.hero.weapons[i],
        });
        slots.push({
            x,
            y: y + 2 * slotSpacing,
            w: window.SLOT_SIZE,
            h: window.SLOT_SIZE,
            item: state.hero.armors[i],
        });
    }
    return slots;
}

export function getSelectedItemArray(state: GameState): Item[] {
    if (state.menuRow === 0) {
        return state.hero.enchantments;
    }
    if (state.menuRow === 1) {
        return state.hero.weapons;
    }
    return state.hero.armors;
}

export function getSelectedItem(state: GameState): Item|undefined {
    if (state.menuEquipmentSelected) {
        if (state.menuRow === 0) {
            return state.hero.equipment.armor;
        }
        return state.hero.equipment.weapon;
    }
    return getSelectedItemArray(state)[getFixedMenuColumn(state)];
}

export function getSelectedInventorySlot(state: GameState): InventorySlot|undefined {
    const item = getSelectedItem(state);
    if (item) {
        return getInventorySlots(state).find(s => s.item === item);
    }
    // If not item is selected, return an empty slot that makes sense, either the
    // empty equipment slot, or the right most slot in that inventory row.
    if (state.menuEquipmentSelected) {
        if (state.menuRow === 0) {
            return armorSlot;
        }
        return weaponSlot;
    }
    return {
        x: window.CANVAS_WIDTH - slotSpacing,
        y: window.CANVAS_HEIGHT - 3 * slotSpacing + state.menuRow * slotSpacing,
        w: window.SLOT_SIZE,
        h: window.SLOT_SIZE,
    };
}

function removeEnchantment(state: GameState, enchantment: Enchantment): boolean {
    const index = state.hero.enchantments.indexOf(enchantment);
    if (index < 0) {
        return false;
    }
    state.hero.enchantments.splice(index, 1);
    return true;
}

function activateItem(state: GameState, item: Item): void {
    // Cannot use items while in the middle of a skill.
    if (state.hero.roll || state.hero.guardSkill.duration || state.hero.attackChargeLevel > 1) {
        return;
    }
    const activeEnchantment = state.hero.activeEnchantment;
    delete state.hero.activeEnchantment;
    if (activeEnchantment) {
        if (item.type !== 'enchantment') {
            if (applyEnchantmentToEquipment(activeEnchantment, item)) {
                removeEnchantment(state, activeEnchantment);
                setDerivedHeroStats(state);
            }
        }
        return;
    }
    if (item.type === 'weapon') {
        const index = state.hero.weapons.indexOf(item);
        if (index >= 0) {
            // Reset charge on changing weapons.
            state.hero.chargingLevel = 1;
            state.hero.attackChargeLevel = 1;
            state.hero.attackChargeDuration = 0;
            state.hero.weapons[index] = state.hero.equipment.weapon;
            state.hero.equipment.weapon = item;
            setDerivedHeroStats(state);
        }
    } else if (item.type === 'armor') {
        const index = state.hero.armors.indexOf(item);
        if (index >= 0) {
            if (state.hero.equipment.armor) {
                state.hero.armors[index] = state.hero.equipment.armor;
            } else {
                state.hero.armors.splice(index, 1);
            }
            state.hero.equipment.armor = item;
            state.hero.guardSkill = {
                cooldownTime: 0,
                charges: 0,
                time: 0,
            };
            setDerivedHeroStats(state);
        }
    } else if (item.type === 'enchantment') {
        state.hero.activeEnchantment = item;
    }
}

function sellItem(state: GameState, item: Item): void {
    // cancel enchantment when selling an item.
    delete state.hero.activeEnchantment;
    if (item.type === 'weapon') {
        const index = state.hero.weapons.indexOf(item);
        if (index >= 0) {
            state.hero.weapons.splice(index, 1);
            gainItemExperience(state, item);
        }
    } else if (item.type === 'armor') {
        const index = state.hero.armors.indexOf(item);
        if (index >= 0) {
            state.hero.armors.splice(index, 1);
            gainItemExperience(state, item);
        }
    } else if (item.type === 'enchantment') {
        if (removeEnchantment(state, item)) {
            gainItemExperience(state, item);
        }
    }
}

function getFixedMenuColumn(state: GameState): number {
    // Keep the column in bounds as the number of items changes.
    const itemArray = getSelectedItemArray(state);
    return Math.max(0, Math.min(itemArray.length - 1, state.menuColumn));
}

export function getHoverInventorySlot(state: GameState): InventorySlot|undefined {
    for (const slot of getInventorySlots(state)) {
        if (isPointInRect(slot, state.mouse)) {
            return slot;
        }
    }
}

export function updateInventory(state: GameState): void {
    if (state.isUsingKeyboard) {
        const hoverItem = getHoverInventorySlot(state)?.item;
        if (hoverItem) {
            if (state.mouse.wasPressed) {
                state.hero.isShooting = false;
                activateItem(state, hoverItem);
            } else if (wasGameKeyPressed(state, GAME_KEY.SELL)) {
                sellItem(state, hoverItem);
            }
        } else if (state.mouse.wasPressed) {
            // Active enchantment is cleared if the mouse is clicked off an item.
            delete state.hero.activeEnchantment;
        }
    } else if (state.isUsingXbox && state.paused) {
        if (wasGameKeyPressed(state, GAME_KEY.UP)) {
            state.menuRow--;
        }
        if (wasGameKeyPressed(state, GAME_KEY.DOWN)) {
            state.menuRow++;
        }
        if (state.menuEquipmentSelected) {
            state.menuRow = (state.menuRow + 2) % 2;
        } else {
            state.menuRow = (state.menuRow + 3) % 3;
        }

        const itemArray = getSelectedItemArray(state);
        if (state.menuEquipmentSelected) {
            if (wasGameKeyPressed(state, GAME_KEY.LEFT)) {
                state.menuEquipmentSelected = false;
                state.menuColumn = 0;
            } else if (wasGameKeyPressed(state, GAME_KEY.RIGHT)) {
                state.menuEquipmentSelected = false;
                state.menuColumn = Math.min(9, Math.max(0, itemArray.length - 1));
            }
        } else {
            if (wasGameKeyPressed(state, GAME_KEY.LEFT)) {
                // Items are displayed right to left, so this is inverted.
                state.menuColumn++;
                if (state.menuColumn >= itemArray.length) {
                    state.menuEquipmentSelected = true;
                    state.menuRow = 0;
                }
            } else if (wasGameKeyPressed(state, GAME_KEY.RIGHT)) {
                // Items are displayed right to left, so this is inverted.
                state.menuColumn--;
                if (state.menuColumn < 0) {
                    state.menuEquipmentSelected = true;
                    state.menuRow = 0;
                }
            }
            state.menuColumn = getFixedMenuColumn(state);
        }

        const selectedItem = getSelectedItem(state);
        if (!selectedItem) {
            return;
        }
        if (wasGameKeyPressed(state, GAME_KEY.ACTIVATE)) {
            activateItem(state, selectedItem);
        } else if (wasGameKeyPressed(state, GAME_KEY.SELL)) {
            sellItem(state, selectedItem);
        }
    }
}

