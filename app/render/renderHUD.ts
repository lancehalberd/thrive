import { BASE_MAX_POTIONS, CANVAS_HEIGHT, CANVAS_WIDTH, CELL_SIZE, SLOT_SIZE, SLOT_PADDING } from 'app/constants';
import { getInventorySlots, getSelectedInventorySlot, getSelectedItem } from 'app/inventory';
import { fillCircle, renderBar } from 'app/render/renderGeometry';
import { renderInventorySlot, renderItemDetails, renderSelectedInventorySlot } from 'app/render/renderInventory';
import { createCanvasAndContext } from 'app/utils/canvas';
import { isPointInRect } from 'app/utils/geometry';
import { weaponTypeLabels, weaponTypes } from 'app/weapons';
import {
    getExperienceForNextLevel,
    getExperienceForNextWeaponLevel,
    getWeaponMastery,
    getWeaponProficiency,
} from 'app/utils/hero';


const minimapSize = 500;
const smallMapRect = {x: CANVAS_WIDTH - 160, y: 10, w: 150, h: 150};
const largeMapRect = {x: (CANVAS_WIDTH - 400) / 2, y: (CANVAS_HEIGHT - 400) / 2, w: 400, h: 400};
const [mapCanvas, mapContext] = createCanvasAndContext(minimapSize, minimapSize);
const mapScale = 15;



export function renderMinimap(state: GameState): void {
    mapContext.fillStyle = '#000';
    mapContext.fillRect(0, 0, minimapSize, minimapSize);
    mapContext.save();
        mapContext.translate(minimapSize / 2, minimapSize / 2);
        mapContext.scale(1 / mapScale, 1 / mapScale);
        mapContext.translate(-state.hero.x, -state.hero.y);
        for (const disc of state.visibleDiscs) {
           /* mapContext.fillStyle = disc.boss ? '#FBB' : (disc.color ?? '#DDD');
            mapContext.beginPath();
            mapContext.arc(disc.x, disc.y, disc.radius, 0, 2 * Math.PI);
            mapContext.fill();*/
            fillCircle(mapContext, disc, disc.boss ? '#FBB' : (disc.color ?? '#DDD'));
        }
        for (const hole of state.holes) {
            fillCircle(mapContext, hole, 'black');
        }
        CELL_SIZE;
        // Debug code to draw world cell boundaries.
        /*mapContext.lineWidth = 4;
        mapContext.strokeStyle = 'red';
        for (const cell of state.activeCells) {
            mapContext.strokeRect(cell.x * CELL_SIZE, (cell.y + 1) * -CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }*/
    mapContext.restore();
}

export function renderHUD(context: CanvasRenderingContext2D, state: GameState): void {
    if (state.paused) {
        context.save();
            context.globalAlpha *= 0.6;
            context.fillStyle = 'black';
            context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        context.restore();
    }

    const minimapRect = state.paused ? largeMapRect : smallMapRect;
    renderMinimap(state);
    context.fillStyle = '#999';
    context.fillRect(minimapRect.x - 2, minimapRect.y - 2, minimapRect.w + 4, minimapRect.h + 4);
    context.fillStyle = 'black';
    context.fillRect(minimapRect.x, minimapRect.y, minimapRect.w, minimapRect.h);
    context.drawImage(mapCanvas,
        minimapSize / 2 - minimapRect.w / 2,
        minimapSize / 2 - minimapRect.h / 2,
        minimapRect.w, minimapRect.h,
        minimapRect.x, minimapRect.y, minimapRect.w, minimapRect.h
    );
    context.fillStyle = '#08F';
    context.strokeStyle = 'white';
    context.fillRect(minimapRect.x + minimapRect.w / 2 - 3, minimapRect.y + minimapRect.h / 2 - 3, 6, 6);
    context.strokeRect(minimapRect.x + minimapRect.w / 2 - 3, minimapRect.y + minimapRect.h / 2 - 3, 6, 6);
    context.fillStyle = 'red';
    for (const enemy of state.enemies) {
        const x = minimapRect.x + minimapRect.w / 2 + (enemy.x - state.hero.x) / mapScale;
        const y = minimapRect.y + minimapRect.w / 2 + (enemy.y - state.hero.y) / mapScale;
        if (x > minimapRect.x + 2 && x < minimapRect.x + minimapRect.w - 2 &&
            y > minimapRect.y + 2 && y < minimapRect.y + minimapRect.h - 2) {
            context.fillRect(x - 2, y - 2, 4, 4);
        }
    }

    context.fillStyle = 'white';
    context.textBaseline = 'top';
    context.textAlign = 'left';
    context.font = '16px sans-serif';
    if (state.hero.disc) {
        context.fillText(state.hero.disc.name, minimapRect.x, minimapRect.y + minimapRect.h + 8);
        context.fillText(`Level ${state.hero.disc.level}`, minimapRect.x, minimapRect.y + minimapRect.h + 26);
    }
    if (state.paused) {
        const instructions = [
            'Press ENTER to pause/unpause.',
            '',
            'Use WASD to move.',
            'Move mouse to aim.',
            'hold left click to shoot.',
            '',
            'Press SPACE to use a life potion.',
            'Potions and life refill on level up.',
            '',
            'Press F to pick up items.',
            'Pess X to sell an item for XP.',
            '',
            'Inventory items:',
            'Left click an item equip it.',
            'Press X on an item to sell it for XP.',
            'Left click an enchantment',
            'then click an armor or weapon.',
            '',
            'Gain charge as you hit enemies.',
            'Right click to use charge.',
            'Enemies can drop portals.',
            'Press F to enter a portal.',
            'Middle click to escape a dungeon.',
            '',
            'On entering/leaving a dungeon:',
            'Progress is saved',
            'Life and potions are restored.',
            '',
            'Go North for harder monsters.',
        ];
        let y = 20;
        for (const line of instructions) {
            context.fillText(line, CANVAS_WIDTH - 280, y);
            y += 20;
        }
    }

    context.fillStyle = 'white';
    context.textBaseline = 'top';
    context.textAlign = 'left';
    context.font = '16px sans-serif';
    context.fillText('Level ' + state.hero.level, 5, 5);

    const lifeRect: Rect = {x: 5, y: 30, h: 20, w: 200};
    renderBar(context, lifeRect, state.hero.life / state.hero.maxLife, 'green', '#888');
    context.fillStyle = 'white';
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = '16px sans-serif';
    context.fillText(state.hero.life + ' / ' + state.hero.maxLife, lifeRect.x + 2, lifeRect.y + lifeRect.h / 2 + 2);

    const experienceRect: Rect = {x: 5, y: lifeRect.y + lifeRect.h + 5, h: 10, w: 200};
    const requiredExperience = getExperienceForNextLevel(state.hero.level);
    renderBar(context, experienceRect, state.hero.experience / requiredExperience, 'orange', '#888');


    let hoveredProficiencyType: WeaponType|undefined;

    let y = CANVAS_HEIGHT - 25;
    let x = SLOT_SIZE + 2 * SLOT_PADDING;
    const weapon = state.hero.equipment.weapon;
    const weaponXpRect: Rect = {x, y, h: 10, w: 160};
    const weaponProficiency = getWeaponProficiency(state, weapon.weaponType);
    const weaponMastery = getWeaponMastery(state, weapon.weaponType);
    const requiredWeaponXp = getExperienceForNextWeaponLevel(weaponProficiency.level);
    renderBar(context, weaponXpRect, weaponProficiency.experience / requiredWeaponXp, 'orange', '#888');
    context.fillStyle = 'white';
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = '16px sans-serif';
    let proficiencyLabel = weaponTypeLabels[weapon.weaponType] + ' skill ' + weaponProficiency.level;
    if (weaponMastery) {
        proficiencyLabel += ' (+' + weaponMastery + ')';
    }
    context.fillText(proficiencyLabel, x, y - 8);
    if (isPointInRect({x, y: CANVAS_HEIGHT - 40, h: 30, w: 160}, state.mouse)) {
        hoveredProficiencyType = weapon.weaponType
    }

    if (state.paused) {
        let y = 200;
        for (const weaponType of weaponTypes) {
            const weaponXpRect: Rect = {x: 5, y, h: 10, w: 160};
            const weaponProficiency = getWeaponProficiency(state, weaponType);
            const weaponMastery = getWeaponMastery(state, weaponType);
            const requiredWeaponXp = getExperienceForNextWeaponLevel(weaponProficiency.level);
            renderBar(context, weaponXpRect, weaponProficiency.experience / requiredWeaponXp, 'orange', '#888');
            context.fillStyle = 'white';
            context.textBaseline = 'middle';
            context.textAlign = 'left';
            context.font = '16px sans-serif';
            let proficiencyLabel = weaponTypeLabels[weaponType] + ' skill ' + weaponProficiency.level;
            if (weaponMastery) {
                proficiencyLabel += ' (+' + weaponMastery + ')';
            }
            context.fillText(proficiencyLabel, 10, y - 8);
            if (isPointInRect({x: weaponXpRect.x, y: y - 20, h: 30, w: 160}, state.mouse)) {
                hoveredProficiencyType = weaponType;
            }
            y += 35
        }
    }

    y -= (SLOT_SIZE + SLOT_PADDING);
    context.fillStyle = 'white';
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = '16px sans-serif';
    context.fillText('Armor ' + state.hero.armor, x, y - 8);


    context.strokeStyle = 'red';
    context.fillStyle = 'red';
    for (let i = 0; i < BASE_MAX_POTIONS; i++) {
        if (i < state.hero.potions) {
            context.fillRect(5 + i * 15, experienceRect.y + experienceRect.h + 5, 10, 15);
        }
        context.strokeRect(5 + i * 15, experienceRect.y + experienceRect.h + 5, 10, 15);
    }


    const chargeRect: Rect = {x: 25, y: experienceRect.y + experienceRect.h + 30, h: 8, w: 140};
    context.fillStyle = 'white';
    context.fillText('' + ((state.hero.chargingLevel | 0) - 1), 5, chargeRect.y + chargeRect.h / 2 + 1);
    if (state.hero.attackChargeLevel > 1) {
        renderBar(context, chargeRect, state.hero.attackChargeDuration / state.hero.totalChargeDuration, 'red', 'white');
    } else {
        //const isFull = state.hero.chargingLevel >= getMaxChargeLevel(state);
        if ((state.hero.chargingLevel | 0) > 1) {
            renderBar(context, chargeRect, 1, 'red', 'white');
            renderBar(context, chargeRect,  state.hero.chargingLevel % 1, 'purple');
        } else {
            renderBar(context, chargeRect,  state.hero.chargingLevel % 1, 'purple', 'white');
        }
    }

    const boss = state.hero.disc?.boss;
    if (!state.paused && boss) {
        const lifeRect: Rect = {x: 210, y: CANVAS_HEIGHT - 60, h: 24, w: CANVAS_WIDTH - 420};
        let color = '#0F0';
        if (boss.life <= boss.maxLife / 4) {
            color = '#F00';
        } else if (boss.life <= boss.maxLife / 2) {
            color = '#F80';
        }
        renderBar(context, lifeRect, boss.life / boss.maxLife, color, '#444');
        context.fillStyle = 'white';
        context.textBaseline = 'middle';
        context.textAlign = 'left';
        context.font = '20px sans-serif';
        context.fillText(boss.definition.name + ' ' + boss.life + ' / ' + boss.maxLife, lifeRect.x + 2, lifeRect.y + lifeRect.h / 2 + 2);
    }

    let hoverItem: Item|undefined = undefined;
    for (const slot of getInventorySlots(state)) {
        renderInventorySlot(context, state, slot);
        if (state.isUsingKeyboard && slot.item && isPointInRect(slot, state.mouse)) {
            hoverItem = slot.item;
        }
    }
    if (state.paused && state.isUsingXbox) {
        renderSelectedInventorySlot(context, state);
        hoverItem = getSelectedItem(state);
    }
    if (hoverItem) {
        let equippedItem: Equipment|undefined;
        if (hoverItem.type === 'weapon') {
            equippedItem = state.hero.equipment.weapon;
        }
        if (hoverItem.type === 'armor') {
            equippedItem = state.hero.equipment.armor;
        }
        if (state.isUsingXbox) {
            const slot = getSelectedInventorySlot(state);
            if (slot) {
                renderItemDetails(context, hoverItem, slot, equippedItem);
            }
        } else {
            renderItemDetails(context, hoverItem, state.mouse, equippedItem);
        }
    }
    if (hoveredProficiencyType) {
        renderProficiencyDetails(context, state, hoveredProficiencyType, state.mouse);
    }
}

const minDetailsWidth = 200;
const minDetailsHeight = 50;

export function renderProficiencyDetails(context: CanvasRenderingContext2D, state: GameState, weaponType: WeaponType, {x, y}: Point): void {
    const weaponProficiency = getWeaponProficiency(state, weaponType).level;
    const weaponMastery = getWeaponMastery(state, weaponType);
    const totalProficiency = weaponProficiency + weaponMastery;
    let w = minDetailsWidth, h = minDetailsHeight;
    const damageIncrease = (100 * Math.pow(1.05, totalProficiency) - 100).toFixed(0);
    const textLines: string[] = [
        `${weaponTypeLabels[weaponType]} Proficiency Bonuses:`,
        '',
        `For ${weaponTypeLabels[weaponType].toLowerCase()}s:`,
        `    ${damageIncrease}% increased damage`,
        `    ${totalProficiency}% increased attack speed`,
        '',
        `For all weapons:`,
    ];
    if (weaponType === 'bow') {
        textLines.push(`    ${(totalProficiency / 10).toFixed(1)}% additional critical strike chance`);
    } else if (weaponType === 'dagger') {
        textLines.push(`    ${totalProficiency}% increased attack speed`);
    } else if (weaponType === 'katana') {
        textLines.push(`    ${totalProficiency}% increased critical damage`);
    } else if (weaponType === 'morningStar') {
        textLines.push(`    ${totalProficiency}% increased effect of armor shred`);
    } else if (weaponType === 'staff') {
        textLines.push(`    ${totalProficiency}% increased charge attack damage`);
    } else if (weaponType === 'sword') {
        textLines.push(`    ${totalProficiency}% increased damage`);
    }

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
