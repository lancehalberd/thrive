import { getInventorySlots, getSelectedInventorySlot, getSelectedItem } from 'app/inventory';
import { fillCircle, renderBar } from 'app/render/renderGeometry';
import { renderInventorySlot, renderItemDetails, renderSelectedInventorySlot } from 'app/render/renderInventory';
import { createCanvasAndContext } from 'app/utils/canvas';
import { abbreviateHealth } from 'app/utils/combat';
import { isPointInRect } from 'app/utils/geometry';
import { getGuardSkillCooldownTime } from 'app/utils/guardSkill'
import { armorTypeLabels, armorTypes } from 'app/armor';
import { weaponTypeLabels, weaponTypes } from 'app/weapons';
import {
    getExperienceForNextLevel,
    getExperienceForNextEquipmentLevel,
} from 'app/utils/coreCalculations';
import {
    getMastery,
    getProficiency,
} from 'app/utils/hero';


const minimapSize = 500;
const smallMapRect = {x: window.CANVAS_WIDTH - 160, y: 10, w: 150, h: 150};
const largeMapRect = {x: (window.CANVAS_WIDTH - 400) / 2, y: (window.CANVAS_HEIGHT - 400) / 2, w: 400, h: 400};
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
        window.CELL_SIZE;
        // Debug code to draw world cell boundaries.
        /*mapContext.lineWidth = 4;
        mapContext.strokeStyle = 'red';
        for (const cell of state.activeCells) {
            mapContext.strokeRect(cell.x * window.CELL_SIZE, (cell.y + 1) * -CELL_SIZE, window.CELL_SIZE, window.CELL_SIZE);
        }*/
    mapContext.restore();
}

export function getEquipmentTypeLabel(type: ArmorType|WeaponType): string {
    if (type === 'lightArmor' || type === 'mediumArmor' || type === 'heavyArmor') {
        return armorTypeLabels[type];
    }
    return weaponTypeLabels[type];
}

export function renderHUD(context: CanvasRenderingContext2D, state: GameState): void {
    if (state.paused) {
        context.save();
            context.globalAlpha *= 0.6;
            context.fillStyle = 'black';
            context.fillRect(0, 0, window.CANVAS_WIDTH, window.CANVAS_HEIGHT);
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
            'Hold left click to shoot.',
            '',
            'Press SPACE to use a life potion.',
            'Potions and life refill on level up.',
            '',
            'Press F to pick up items.',
            'Pess X to sell an item for XP.',
            '',
            'Inventory items:',
            '  Left click an item equip it.',
            '  Press X on an item to sell it for XP.',
            '  Left click an enchantment',
            '  then click an armor or weapon.',
            '',
            'Gain charge as you hit enemies.',
            'Right click to use charge.',
            '',
            'Enemies can drop portals.',
            'Press F to enter a portal.',
            'Middle click to escape a dungeon.',
            '',
            'On entering/leaving a dungeon:',
            '  Progress is saved',
            '  Life and potions are restored.',
            '',
            'Go North for harder monsters.',
        ];
        let y = 20;
        for (const line of instructions) {
            context.fillText(line, window.CANVAS_WIDTH - 280, y);
            y += 20;
        }
    }

    context.fillStyle = 'white';
    context.textBaseline = 'top';
    context.textAlign = 'left';
    context.font = '16px sans-serif';
    context.fillText('Level ' + state.hero.level, 5, 5);

    context.fillText('Armor ', 100, 5);
    if (state.hero.armor < state.hero.baseArmor) {
        context.fillStyle = '#AAA';
    } else if (state.hero.armor > state.hero.baseArmor) {
        context.fillStyle = '#AFA';
    }
    context.fillText('' + (state.hero.armor | 0), 100 + context.measureText('Armor ').width, 5);

    const lifeRect: Rect = {x: 5, y: 30, h: 20, w: 200};
    renderBar(context, lifeRect, state.hero.life / state.hero.maxLife, 'green', '#888');
    context.fillStyle = 'white';
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = '16px sans-serif';
    context.fillText(Math.ceil(state.hero.life) + ' / ' + state.hero.maxLife, lifeRect.x + 2, lifeRect.y + lifeRect.h / 2 + 2);

    const experienceRect: Rect = {x: 5, y: lifeRect.y + lifeRect.h + 5, h: 10, w: 200};
    const requiredExperience = getExperienceForNextLevel(state.hero.level);
    renderBar(context, experienceRect, state.hero.experience / requiredExperience, 'orange', '#888');


    let hoveredProficiencyType: ArmorType|WeaponType|undefined;

    let y = window.CANVAS_HEIGHT - 25;
    let x = window.SLOT_SIZE + 2 * window.SLOT_PADDING;
    const {armor, weapon} = state.hero.equipment;
    const weaponXpRect: Rect = {x, y, h: 10, w: 160};
    const weaponProficiency = getProficiency(state, weapon.weaponType);
    const weaponMastery = getMastery(state, weapon.weaponType);
    const requiredWeaponXp = getExperienceForNextEquipmentLevel(weaponProficiency.level);
    renderBar(context, weaponXpRect, weaponProficiency.experience / requiredWeaponXp, 'orange', '#888');
    context.fillStyle = 'white';
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = '16px sans-serif';
    let weaponProficiencyLabel = weaponTypeLabels[weapon.weaponType] + ' skill ' + weaponProficiency.level;
    if (weaponMastery) {
        weaponProficiencyLabel += ' (+' + weaponMastery + ')';
    }
    context.fillText(weaponProficiencyLabel, x, y - 8);
    if (isPointInRect({x, y: window.CANVAS_HEIGHT - 40, h: 30, w: 160}, state.mouse)) {
        hoveredProficiencyType = weapon.weaponType
    }

    if (state.paused) {
        let y = 200;
        for (const type of [...armorTypes, ...weaponTypes]) {
            const xpRect: Rect = {x: 5, y, h: 10, w: 160};
            const proficiency = getProficiency(state, type);
            const mastery = getMastery(state, type);
            const requiredWeaponXp = getExperienceForNextEquipmentLevel(proficiency.level);
            renderBar(context, xpRect, proficiency.experience / requiredWeaponXp, 'orange', '#888');
            context.fillStyle = 'white';
            context.textBaseline = 'middle';
            context.textAlign = 'left';
            context.font = '16px sans-serif';
            let proficiencyLabel = getEquipmentTypeLabel(type);
            proficiencyLabel += ' skill ' + proficiency.level;
            if (mastery) {
                proficiencyLabel += ' (+' + mastery + ')';
            }
            context.fillText(proficiencyLabel, 10, y - 8);
            if (isPointInRect({x: xpRect.x, y: y - 20, h: 30, w: 160}, state.mouse)) {
                hoveredProficiencyType = type;
            }
            y += 35
        }
    }

    y -= (window.SLOT_SIZE + window.SLOT_PADDING);


    const armorXpRect: Rect = {x, y, h: 10, w: 160};
    const armorProficiency = getProficiency(state, armor.armorType);
    const armorMastery = getMastery(state, armor.armorType);
    const requireArmorXp = getExperienceForNextEquipmentLevel(armorProficiency.level);
    renderBar(context, armorXpRect, armorProficiency.experience / requireArmorXp, 'orange', '#888');
    context.fillStyle = 'white';
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = '16px sans-serif';
    let armorProficiencyLabel = armorTypeLabels[armor.armorType] + ' skill ' + weaponProficiency.level;
    if (armorMastery) {
        armorProficiencyLabel += ' (+' + armorMastery + ')';
    }
    context.fillText(armorProficiencyLabel, x, y - 8);
    if (isPointInRect({x, y: window.CANVAS_HEIGHT - 40 - (window.SLOT_SIZE + window.SLOT_PADDING), h: 30, w: 160}, state.mouse)) {
        hoveredProficiencyType = armor.armorType
    }

    context.strokeStyle = 'red';
    context.fillStyle = 'red';
    for (let i = 0; i < window.BASE_MAX_POTIONS; i++) {
        if (i < state.hero.potions) {
            context.fillRect(5 + i * 15, experienceRect.y + experienceRect.h + 5, 10, 15);
        }
        context.strokeRect(5 + i * 15, experienceRect.y + experienceRect.h + 5, 10, 15);
    }


    const chargeRect: Rect = {x: 25, y: experienceRect.y + experienceRect.h + 30, h: 8, w: 140};
    context.fillStyle = 'white';
    if (state.hero.attackChargeLevel > 1) {
        context.fillText('' + ((state.hero.attackChargeLevel | 0) - 1), 5, chargeRect.y + chargeRect.h / 2 + 1);
        renderBar(context, chargeRect, state.hero.attackChargeDuration / state.hero.totalChargeDuration, 'red', 'white');
    } else {
        context.fillText('' + ((state.hero.chargingLevel | 0) - 1), 5, chargeRect.y + chargeRect.h / 2 + 1);
        //const isFull = state.hero.chargingLevel >= getMaxChargeLevel(state);
        if ((state.hero.chargingLevel | 0) > 1) {
            renderBar(context, chargeRect, 1, 'red', 'white');
            renderBar(context, chargeRect,  state.hero.chargingLevel % 1, 'purple');
        } else {
            renderBar(context, chargeRect,  state.hero.chargingLevel % 1, 'purple', 'white');
        }
    }
    const guardChargeRect: Rect = {x: chargeRect.x, y: chargeRect.y + 20, h: 8, w: 140};
    context.fillStyle = 'white';
    context.fillText('' + state.hero.guardSkill.charges, 5, guardChargeRect.y + guardChargeRect.h / 2 + 1);
    if (state.hero.guardSkill.charges >= 1) {
        renderBar(context, guardChargeRect, 1, 'lightblue', 'white');
        renderBar(context, guardChargeRect,  state.hero.guardSkill.cooldownTime / getGuardSkillCooldownTime(state), 'blue');
    } else {
        renderBar(context, guardChargeRect,  state.hero.guardSkill.cooldownTime / getGuardSkillCooldownTime(state), 'blue', 'white');
    }

    const boss = state.hero.disc?.boss;
    if (!state.paused && boss) {
        const lifeRect: Rect = {x: 210, y: window.CANVAS_HEIGHT - 60, h: 24, w: window.CANVAS_WIDTH - 420};
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
        context.fillText(boss.definition.name +
            ' ' + abbreviateHealth(Math.ceil(boss.life)) + ' / ' + abbreviateHealth(boss.maxLife), lifeRect.x + 2, lifeRect.y + lifeRect.h / 2 + 2);
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
                renderItemDetails(context, state, hoverItem, slot, equippedItem);
            }
        } else {
            renderItemDetails(context, state, hoverItem, state.mouse, equippedItem);
        }
    }
    if (hoveredProficiencyType) {
        renderProficiencyDetails(context, state, hoveredProficiencyType, state.mouse);
    }
}

const minDetailsWidth = 200;
const minDetailsHeight = 50;

export function renderProficiencyDetails(context: CanvasRenderingContext2D, state: GameState, type: ArmorType|WeaponType, {x, y}: Point): void {
    const proficiency = getProficiency(state, type).level;
    const mastery = getMastery(state, type);
    const totalProficiency = proficiency + mastery;
    let w = minDetailsWidth, h = minDetailsHeight;
    let textLines: string[] = [
        `${getEquipmentTypeLabel(type)} Proficiency Bonuses:`,
        '',
    ];
    if (type === 'lightArmor') {
        textLines = [
            `For ${getEquipmentTypeLabel(type).toLowerCase()}s:`,
            `    ${totalProficiency}% increased cooldown speed for dash`,
            '',
            `For any armor:`,
        ];
    } else if (type === 'mediumArmor') {
        textLines = [
            `For ${getEquipmentTypeLabel(type).toLowerCase()}s:`,
            `    ${totalProficiency}% increased radius of bullet dispersion`,
            '',
            `For any armor:`,
        ];
    } else if (type === 'heavyArmor') {
        textLines = [
            `For ${getEquipmentTypeLabel(type).toLowerCase()}s:`,
            `    ${totalProficiency}% increased duration of shield`,
            '',
            `For any armor:`,
        ];
    } else{
        const damageIncrease = (100 * Math.pow(1.05, totalProficiency) - 100).toFixed(0);
        textLines = [
            ...textLines,
            `For ${getEquipmentTypeLabel(type).toLowerCase()}s:`,
            `    ${damageIncrease}% increased damage`,
            `    ${totalProficiency}% increased attack speed`,
            '',
            `For all weapons:`,
        ]
    }
    if (type === 'bow') {
        textLines.push(`    ${(totalProficiency / 10).toFixed(1)}% additional critical strike chance`);
    } else if (type === 'dagger') {
        textLines.push(`    ${totalProficiency}% increased attack speed`);
    } else if (type === 'katana') {
        textLines.push(`    ${totalProficiency}% increased critical damage`);
    } else if (type === 'morningStar') {
        textLines.push(`    ${totalProficiency}% increased effect of armor shred`);
    } else if (type === 'wand') {
        textLines.push(`    ${totalProficiency}% increased charge attack damage`);
    } else if (type === 'sword') {
        textLines.push(`    ${totalProficiency}% increased damage`);
    } else if (type === 'lightArmor') {
        textLines.push(`    ${totalProficiency}% increased bullet shave radius`);
    } else if (type === 'mediumArmor') {
        textLines.push(`    ${totalProficiency}% increased life`);
    } else if (type === 'heavyArmor') {
        textLines.push(`    ${totalProficiency}% increased armor`);
    }

    const lineWidths: number[] = [];
    for (const line of textLines) {
        const lineWidth = context.measureText(line).width;
        w = Math.max(w, lineWidth + 20);
        lineWidths.push(lineWidth);
    }
    h = Math.max(h, textLines.length * 20 + 20);
    x = Math.max(10, Math.min(window.CANVAS_WIDTH - 10 - w, x - w / 2));
    y = Math.max(10, Math.min(window.CANVAS_HEIGHT - 10 - h, y - h - 10));
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
