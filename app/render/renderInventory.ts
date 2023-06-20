import { CANVAS_WIDTH, CANVAS_HEIGHT } from 'app/constants';
import { drawRect, fillCircle } from 'app/render/renderGeometry';
import { embossText } from 'app/render/renderText';
import { armorTypeLabels } from 'app/armor';
import { enchantmentStrengthLabels, getEnchantmentBonusText } from 'app/enchantments';
import { getSelectedInventorySlot } from 'app/inventory';
import { uniqueEnchantmentHash } from 'app/uniqueEnchantmentHash';
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

export function renderSelectedInventorySlot(context: CanvasRenderingContext2D, state: GameState): void {
    const slot = getSelectedInventorySlot(state) ;
    if (!slot) {
        return;
    }
    const {x, y, w, h} = slot;
    context.fillStyle = 'blue';
    context.beginPath();
    drawRect(context, {x, y, w, h});
    drawRect(context, {x: x + 2, y: y + 2, w: w - 4, h: h - 4}, true);
    context.fill();
}

export function renderArmorLong(context: CanvasRenderingContext2D, x: number, y: number, armor: Armor): void {
    fillCircle(context, {x, y, radius: 12}, '#88F');
    renderItemSlots(context, x, y, armor);
    const label = armor.name;
    embossText(context, label, x, y + 2, {size: 16, color: 'white', borderColor: 'black'});
}
export function renderArmorShort(context: CanvasRenderingContext2D, x: number, y: number, armor: Armor): void {
    fillCircle(context, {x, y, radius: 12}, '#88F');
    renderItemSlots(context, x, y, armor);
    const label = armor.armorType.charAt(0).toUpperCase() + armor.level;
    embossText(context, label, x, y + 2, {size: 16, color: 'white', borderColor: 'black'});
}

export function renderEnchantmentLong(context: CanvasRenderingContext2D, x: number, y: number, enchantment: Enchantment): void {
    fillCircle(context, {x, y, radius: 12}, '#8F8');
    const label = enchantmentStrengthLabels[enchantment.strength] + ' ' + enchantment.name + ' enchantment';
    embossText(context, label, x, y + 2, {size: 16, color: 'white', borderColor: 'black'});
}
export function renderEnchantmentShort(context: CanvasRenderingContext2D, x: number, y: number, enchantment: Enchantment): void {
    fillCircle(context, {x, y, radius: 12}, '#8F8');
    const label = enchantment.name.charAt(0).toUpperCase() + enchantment.strength;
    embossText(context, label, x, y + 2, {size: 16, color: 'white', borderColor: 'black'});
}

export function renderWeaponLong(context: CanvasRenderingContext2D, x: number, y: number, weapon: Weapon): void {
    fillCircle(context, {x, y, radius: 12}, '#F88');
    renderItemSlots(context, x, y, weapon);
    const label = weapon.name;
    embossText(context, label, x, y + 2, {size: 16, color: 'white', borderColor: 'black'});
}
export function renderWeaponShort(context: CanvasRenderingContext2D, x: number, y: number, weapon: Weapon): void {
    fillCircle(context, {x, y, radius: 12}, '#F88');
    renderItemSlots(context, x, y, weapon);
    const label = weapon.weaponType.charAt(0).toUpperCase() + weapon.level;
    embossText(context, label, x, y + 2, {size: 16, color: 'white', borderColor: 'black'});
}

function renderItemSlots(context: CanvasRenderingContext2D, x: number, y: number, item: Equipment): void {
    for (let i = 0; i < item.enchantmentSlots.length; i++) {
        let sx = x - 10 + 20 * (i % 2), sy = y - 10 + 20 * Math.floor(i / 2);
        if (item.enchantmentSlots[i].enchantmentType !== 'empty') {
            fillCircle(context, {x: sx, y: sy, radius: 4}, '#8F8');
        } else {
            fillCircle(context, {x: sx, y: sy, radius: 4}, 'white');
        }
        context.beginPath();
        context.strokeStyle = 'black';
        context.arc(sx, sy, 4, 0, 2 * Math.PI);
        context.stroke();
    }
    if (item.bonusEnchantmentSlots.length > 0) {
        fillCircle(context, {x, y, radius: 7}, 'yellow');
    }
}


const minDetailsWidth = 200;
const minDetailsHeight = 50;

export function renderItemDetails(context: CanvasRenderingContext2D, state: GameState, item: Item, {x, y}: Point, equippedItem?: Equipment): void {
    let w = minDetailsWidth, h = minDetailsHeight;
    context.font = `16px monospace`;
    const textLines: string[] = equippedItem && equippedItem !== item && item.type !== 'enchantment'
        ? getItemComparisonTextLines(state, item, equippedItem)
        : getItemTextLines(state, item);
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
    for (let i = 0; i < textLines.length; i++) {
        const line = textLines[i];
        context.fillText(line, x + 10, y + 10 + 20 * i);
    }
}

function getItemTextLines(state: GameState, item: Item): string[] {
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
            //Math.round(item.damage * item.shots.length * item.attacksPerSecond) + ' DPS',
            item.damage + ' Damage',
            (item.shots.length * item.attacksPerSecond).toFixed(2) + ' Attacks per second',
            ...getEnchantmentTextLines(state, item),
        ];
    }
    if (item.type === 'armor') {
        return [
            item.name,
            'Lv ' + item.level + ' ' + armorTypeLabels[item.armorType],
            item.armor + ' Armor',
            '+' + item.life + ' Life',
            ...getEnchantmentTextLines(state, item),
        ];
    }
    return [];
}

function getItemComparisonTextLines(state: GameState, newItem: Equipment, equippedItem: Equipment): string[] {
    if (newItem.type === 'weapon' && equippedItem.type === 'weapon') {
        //const oldDps = Math.round(equippedItem.damage * equippedItem.shots.length * equippedItem.attacksPerSecond);
        //const newDps = Math.round(newItem.damage * newItem.shots.length * newItem.attacksPerSecond);
        return [
            newItem.name,
            'Lv ' + newItem.level + ' ' + weaponTypeLabels[newItem.weaponType],
            //oldDps + ' → ' + newDps + ' DPS',
            equippedItem.damage +  ' → ' + newItem.damage + ' Damage',
            (equippedItem.shots.length * equippedItem.attacksPerSecond).toFixed(2)
                + ' → '
                + (newItem.shots.length * newItem.attacksPerSecond).toFixed(2)
                + ' Attacks per second',
            ...getEnchantmentComparisonTextLines(state, newItem, equippedItem),
            ...getBonusEnchantmentComparisonTextLines(state, newItem, equippedItem),
        ];
    }
    if (newItem.type === 'armor' && equippedItem.type === 'armor') {
        return [
            newItem.name,
            'Lv ' + newItem.level + ' ' + armorTypeLabels[newItem.armorType],
            equippedItem.armor + ' → ' + newItem.armor + ' Armor',
           '+' + equippedItem.life + ' → ' +'+' + newItem.life + ' Life',
            ...getEnchantmentComparisonTextLines(state, newItem, equippedItem),
            ...getBonusEnchantmentComparisonTextLines(state, newItem, equippedItem),
        ];
    }
    return [];
}


function getEnchantmentTextLines(state: GameState, item: Equipment): string[] {
    return [
        ...item.enchantmentSlots.map(e => getEnchantmentText(state, e)).flat(),
        ...item.bonusEnchantmentSlots.map(e => getEnchantmentText(state, e)).flat(),
     ];
}

function getEnchantmentComparisonTextLines(state: GameState, newItem: Equipment, equippedItem: Equipment): string[] {
    const lines: string[] = [];
    for (let i = 0; i < newItem.enchantmentSlots.length || i < equippedItem.enchantmentSlots.length; i++) {
        const currentLines = getEnchantmentText(state, equippedItem.enchantmentSlots[i]);
        const newLines = getEnchantmentText(state, newItem.enchantmentSlots[i]);
        const maxLines = Math.max(currentLines.length, newLines.length);
        const maxCurrentLineLength = Math.max(...currentLines.map(l => l.length));
        // This is a pretty hacky way of trying to show a transition between two lines of text
        for (let j = 0; j < maxLines;j++) {
            const currentLine = currentLines[j];
            const newLine = newLines[j];
            let padding = ' '.repeat(maxCurrentLineLength - (currentLine?.length || 0));
            if (currentLine && newLine) {
                lines.push(currentLine + ' → ' + padding + newLine);
            } else if(currentLine) {
                lines.push(currentLine);
            } else {
                lines.push(padding + '   ' + newLine);
            }
        }
    }
    return lines;
}

function getBonusEnchantmentComparisonTextLines(state: GameState, newItem: Equipment, equippedItem: Equipment): string[] {
    const lines: string[] = [];
    for (let i = 0; i < newItem.bonusEnchantmentSlots.length || i < equippedItem.bonusEnchantmentSlots.length; i++) {
        const currentLines = getEnchantmentText(state, equippedItem.bonusEnchantmentSlots[i]);
        const newLines = getEnchantmentText(state, newItem.bonusEnchantmentSlots[i]);
        const maxLines = Math.max(currentLines.length, newLines.length);
        const maxCurrentLineLength = Math.max(...currentLines.map(l => l.length));
        // This is a pretty hacky way of trying to show a transition between two lines of text
        for (let j = 0; j < maxLines;j++) {
            const currentLine = currentLines[j];
            const newLine = newLines[j];
            let padding = ' '.repeat(maxCurrentLineLength - (currentLine?.length || 0));
            if (currentLine && newLine) {
                lines.push(currentLine + ' → ' + padding + newLine);
            } else if(currentLine) {
                lines.push(currentLine);
            } else {
                lines.push(padding + '   ' + newLine);
            }
        }
    }
    return lines;
}

function getEnchantmentText(state: GameState, enchantment?: ItemEnchantment): string[] {
    if (!enchantment) {
        return ['-- '];
    }
    if (enchantment.enchantmentType === 'empty') {
        return ['Empty Slot'];
    }
    if (enchantment.enchantmentType === 'uniqueArmorEnchantment' || enchantment.enchantmentType === 'uniqueWeaponEnchantment') {
        const definition = uniqueEnchantmentHash[enchantment.uniqueEnchantmentKey];
        return definition.getDescription?.(state, enchantment);
    }
    if (!enchantment.value) {
        return [enchantment.enchantmentType];
    }
    return getEnchantmentBonusText(enchantment.enchantmentType, enchantment.value);
}
