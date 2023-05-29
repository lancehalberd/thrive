import { CANVAS_HEIGHT, CANVAS_WIDTH, GAME_KEY, SLOT_PADDING, SLOT_SIZE } from 'app/constants';
import { isPointInRect } from 'app/utils/geometry';
import { gainItemExperience, setDerivedHeroStats } from 'app/utils/hero';
import { wasGameKeyPressed } from 'app/utils/userInput';

const slotSpacing = SLOT_SIZE + SLOT_PADDING;

export function getInventorySlots(state: GameState): InventorySlot[] {
    const slots: InventorySlot[] = [
        {
            x: CANVAS_WIDTH - 2 * slotSpacing,
            y: CANVAS_HEIGHT - 3 * slotSpacing,
            w: SLOT_SIZE,
            h: SLOT_SIZE,
            item: state.hero.equipment.weapon,
        },
        {
            x: CANVAS_WIDTH - slotSpacing,
            y: CANVAS_HEIGHT - 3 * slotSpacing,
            w: SLOT_SIZE,
            h: SLOT_SIZE,
            item: state.hero.equipment.armor,
        }
    ];
    const slotCount = state.paused ? 10 : 3;
    const y = CANVAS_HEIGHT - 2 * slotSpacing;
    for (let i = 0; i < slotCount; i++) {
        const x = CANVAS_WIDTH - (i + 1) * slotSpacing;
        slots.push({
            x,
            y,
            w: SLOT_SIZE,
            h: SLOT_SIZE,
            item: state.hero.weapons[i],
        });
        slots.push({
            x,
            y: y + slotSpacing,
            w: SLOT_SIZE,
            h: SLOT_SIZE,
            item: state.hero.armors[i],
        });
    }
    return slots;
}

export function updateInventory(state: GameState): void {
    let hoverItem: Item|undefined;
    for (const slot of getInventorySlots(state)) {
        if (slot.item && isPointInRect(slot, state.mouse)) {
            hoverItem = slot.item;
        }
    }
    if (hoverItem) {
        if (state.mouse.wasPressed) {
            state.hero.isShooting = false;
            if (hoverItem.type === 'weapon') {
                const index = state.hero.weapons.indexOf(hoverItem);
                if (index >= 0) {
                    state.hero.weapons[index] = state.hero.equipment.weapon;
                    state.hero.equipment.weapon = hoverItem;
                    setDerivedHeroStats(state);
                }
            }
            if (hoverItem.type === 'armor') {
                const index = state.hero.armors.indexOf(hoverItem);
                if (index >= 0) {
                    if (state.hero.equipment.armor) {
                        state.hero.armors[index] = state.hero.equipment.armor;
                    } else {
                        state.hero.armors.splice(index, 1);
                    }
                    state.hero.equipment.armor = hoverItem;
                    setDerivedHeroStats(state);
                }
            }
        } else if (wasGameKeyPressed(state, GAME_KEY.SELL)) {
            if (hoverItem.type === 'weapon') {
                const index = state.hero.weapons.indexOf(hoverItem);
                if (index >= 0) {
                    state.hero.weapons.splice(index, 1);
                    gainItemExperience(state, hoverItem.level);
                }
            }
            if (hoverItem.type === 'armor') {
                const index = state.hero.armors.indexOf(hoverItem);
                if (index >= 0) {
                    state.hero.armors.splice(index, 1);
                    gainItemExperience(state, hoverItem.level);
                }
            }
        }
    }
}

