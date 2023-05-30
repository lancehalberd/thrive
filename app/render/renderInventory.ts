import { CANVAS_WIDTH, CANVAS_HEIGHT } from 'app/constants';
import { drawRect, fillCircle } from 'app/render/renderGeometry';
import { embossText } from 'app/render/renderText';
import { armorTypeLabels } from 'app/armor';
import { enchantmentStrengthLabels, getEnchantmentBonusText } from 'app/enchantments';
import { weaponTypeLabels } from 'app/weapons';

export function renderInventorySlot(context: CanvasRenderingContext2D, state: GameState, {x, y, w, h, item}: InventorySlot): void {
    context.fillStyle = 'white';
    context.beginPath();
    drawRect(context, {x, y, w, h});
    drawRect(context, {x: x + 2, y: y + 2, w: w - 4, h: h - 4}, true);
    context.fill();
    if (item?.type === 'armor') {
        renderArmorShort(context, x + w / 2, y + h / 2, item);
    }
    if (item?.type === 'enchantment') {
        renderEnchantmentShort(context, x + w / 2, y + h / 2, item);
        if (state.hero.activeEnchantment === item) {
            context.save();
                context.globalAlpha *= 0.6;
                context.fillStyle = 'white';
                context.fillRect(x, y, w, h);
            context.restore();
        }
    }
    if (item?.type === 'weapon') {
        renderWeaponShort(context, x + w / 2, y + h / 2, item);
    }
}

export function renderArmorLong(context: CanvasRenderingContext2D, x: number, y: number, armor: Armor): void {
    fillCircle(context, {x, y, radius: 12}, '#88F');
    const label = armor.name;
    embossText(context, label, x, y, {size: 16, color: 'white', borderColor: 'black'});
}
export function renderArmorShort(context: CanvasRenderingContext2D, x: number, y: number, armor: Armor): void {
    fillCircle(context, {x, y, radius: 12}, '#88F');
    const label = armor.armorType.charAt(0).toUpperCase() + armor.level;
    embossText(context, label, x, y, {size: 16, color: 'white', borderColor: 'black'});
}

export function renderEnchantmentLong(context: CanvasRenderingContext2D, x: number, y: number, enchantment: Enchantment): void {
    fillCircle(context, {x, y, radius: 12}, '#8F8');
    const label = enchantmentStrengthLabels[enchantment.strength] + ' ' + enchantment.name + ' enchantment';
    embossText(context, label, x, y, {size: 16, color: 'white', borderColor: 'black'});
}
export function renderEnchantmentShort(context: CanvasRenderingContext2D, x: number, y: number, enchantment: Enchantment): void {
    fillCircle(context, {x, y, radius: 12}, '#8F8');
    const label = 'E' + enchantment.strength;
    embossText(context, label, x, y, {size: 16, color: 'white', borderColor: 'black'});
}

export function renderWeaponLong(context: CanvasRenderingContext2D, x: number, y: number, weapon: Weapon): void {
    fillCircle(context, {x, y, radius: 12}, '#F88');
    const label = weapon.name;
    embossText(context, label, x, y, {size: 16, color: 'white', borderColor: 'black'});
}
export function renderWeaponShort(context: CanvasRenderingContext2D, x: number, y: number, weapon: Weapon): void {
    fillCircle(context, {x, y, radius: 12}, '#F88');
    const label = weapon.weaponType.charAt(0).toUpperCase() + weapon.level;
    embossText(context, label, x, y, {size: 16, color: 'white', borderColor: 'black'});
}


const minDetailsWidth = 200;
const minDetailsHeight = 50;

export function renderItemDetails(context: CanvasRenderingContext2D, item: Item, {x, y}: Point, equippedItem?: Equipment): void {
    let w = minDetailsWidth, h = minDetailsHeight;
    const textLines: string[] = equippedItem && equippedItem !== item && item.type !== 'enchantment'
        ? getItemComparisonTextLines(item, equippedItem)
        : getItemTextLines(item);
    const lineWidths: number[] = [];
    for (const line of textLines) {
        const lineWidth = context.measureText(line).width;
        w = Math.max(w, lineWidth + 20);
        lineWidths.push(lineWidth);
    }
    h = Math.max(h, textLines.length * 20 + 20);
    x = Math.max(10, Math.min(CANVAS_WIDTH - 10 - w, x - w / 2));
    y = Math.max(10, Math.min(CANVAS_HEIGHT - 10 - h, y - h - 10));
    context.fillStyle = 'white';
    context.fillRect(x, y, w, h);
    context.fillStyle = 'black';
    context.fillRect(x + 2, y + 2, w - 4, h - 4);
    context.fillStyle = 'white';
    context.textBaseline = 'top';
    context.textAlign = 'left';
    context.font = `16px sans-serif`;
    for (let i = 0; i < textLines.length; i++) {
        const line = textLines[i];
        context.fillText(line, x + 10, y + 10 + 20 * i);
    }
}

function getItemTextLines(item: Item): string[] {
    if (item.type === 'enchantment') {
        return [
            enchantmentStrengthLabels[item.strength] + ' ' + item.name + ' enchantment',
            'Weapon: Grants '+ getEnchantmentBonusText(item.weaponEnchantmentType, 10 * item.strength, 20 * item.strength),
            'Armor: Grants '+ getEnchantmentBonusText(item.armorEnchantmentType, 10 * item.strength, 20 * item.strength),
        ];
    }
    if (item.type === 'weapon') {
        return [
            item.name,
            'Lv ' + item.level + ' ' + weaponTypeLabels[item.weaponType],
            Math.round(item.damage * item.shots.length * item.attacksPerSecond) + ' DPS',
            ...getEnchantmentTextLines(item),
        ];
    }
    if (item.type === 'armor') {
        return [
            item.name,
            'Lv ' + item.level + ' ' + armorTypeLabels[item.armorType],
            item.armor + ' Armor',
            '+' + item.life + ' Life',
            ...getEnchantmentTextLines(item),
        ];
    }
    return [];
}

function getItemComparisonTextLines(newItem: Equipment, equippedItem: Equipment): string[] {
    if (newItem.type === 'weapon' && equippedItem.type === 'weapon') {
        const oldDps = Math.round(equippedItem.damage * equippedItem.shots.length * equippedItem.attacksPerSecond);
        const newDps = Math.round(newItem.damage * newItem.shots.length * newItem.attacksPerSecond);
        return [
            newItem.name,
            'Lv ' + newItem.level + ' ' + weaponTypeLabels[newItem.weaponType],
            oldDps + ' → ' + newDps + ' DPS',
            ...getEnchantmentComparisonTextLines(newItem, equippedItem),
        ];
    }
    if (newItem.type === 'armor' && equippedItem.type === 'armor') {
        return [
            newItem.name,
            'Lv ' + newItem.level + ' ' + armorTypeLabels[newItem.armorType],
            equippedItem.armor + ' → ' + newItem.armor + ' Armor',
           '+' + equippedItem.life + ' → ' +'+' + newItem.life + ' Life',
            ...getEnchantmentComparisonTextLines(newItem, equippedItem),
        ];
    }
    return [];
}


function getEnchantmentTextLines(item: Equipment): string[] {
    return item.enchantmentSlots.map(getEnchantmentText);
}

function getEnchantmentComparisonTextLines(newItem: Equipment, equippedItem: Equipment): string[] {
    const lines: string[] = [];
    for (let i = 0; i < newItem.enchantmentSlots.length || i < equippedItem.enchantmentSlots.length; i++) {
        lines.push(getEnchantmentText(equippedItem.enchantmentSlots[i]) + ' → ' + getEnchantmentText(newItem.enchantmentSlots[i]));
    }
    return lines;
}

function getEnchantmentText(enchantment?: ItemEnchantment): string {
    if (!enchantment) {
        return '-- ';
    }
    if (enchantment.enchantmentType === 'empty') {
        return 'Empty Slot';
    }
    if (!enchantment.value) {
        return enchantment.enchantmentType
    }
    return getEnchantmentBonusText(enchantment.enchantmentType, enchantment.value);
}
