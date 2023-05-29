import { BASE_MAX_POTIONS, CANVAS_HEIGHT, CANVAS_WIDTH, SIGHT_RADIUS } from 'app/constants';
import { getInventorySlots } from 'app/inventory';
import { fillCircle } from 'app/render/renderGeometry';
import { renderInventorySlot, renderItemDetails } from 'app/render/renderInventory';
import { createCanvasAndContext } from 'app/utils/canvas';
import { doCirclesIntersect, isPointInRect } from 'app/utils/geometry';
import { weaponTypeLabels, weaponTypes } from 'app/weapons';
import {
    getExperienceForNextLevel,
    getExperienceForNextWeaponLevel,
    getWeaponProficiency,
} from 'app/utils/hero';


const minimapSize = 500;
const smallMapRect = {x: CANVAS_WIDTH - 155, y: 5, w: 150, h: 150};
const largeMapRect = {x: (CANVAS_WIDTH - 400) / 2, y: (CANVAS_HEIGHT - 400) / 2, w: 400, h: 400};
const [mapCanvas, mapContext] = createCanvasAndContext(minimapSize, minimapSize);
const mapScale = 20;

export function renderMinimap(discs: Disc[]): void {
    mapContext.fillStyle = '#000';
    mapContext.fillRect(0, 0, minimapSize, minimapSize);
    mapContext.save();
        mapContext.translate(minimapSize / 2, minimapSize / 2);
        mapContext.scale(1 / mapScale, 1 / mapScale);
        for (const disc of discs) {
            mapContext.fillStyle = disc.boss ? '#FBB' : '#DDD';
            mapContext.beginPath();
            mapContext.arc(disc.x, disc.y, disc.radius, 0, 2 * Math.PI);
            mapContext.fill();
        }
    mapContext.restore();
}

export function render(context: CanvasRenderingContext2D, state: GameState): void {
    context.fillStyle = '#000';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.save();
        context.translate(CANVAS_WIDTH / 2 - state.hero.x, CANVAS_HEIGHT / 2 - state.hero.y);
        state.visibleDiscs.sort((A: Disc, B: Disc) => A.y - B.y);
        const normalDiscs = state.visibleDiscs.filter(d => !d.boss);
        const bossDiscs = state.visibleDiscs.filter(d => d.boss);
        for (const disc of state.visibleDiscs) {
            renderDiscEdge1(context, disc);
        }
        for (const disc of state.visibleDiscs) {
            renderDiscEdge2(context, disc);
        }
        for (const disc of normalDiscs) {
            renderDisc(context, disc);
        }
        for (const disc of normalDiscs) {
            renderDiscCenter(context, disc);
        }
        // Render tops of boss discs over other discs to make the arena edge clear.
        for (const disc of bossDiscs) {
            renderDisc(context, disc);
        }
        for (const disc of bossDiscs) {
            renderDiscCenter(context, disc);
        }
        for (const portal of state.portals) {
            renderPortal(context, state, portal);
        }
        if (state.hero?.disc?.boss) {
            context.save();
                context.translate(-(CANVAS_WIDTH / 2 - state.hero.x), -(CANVAS_HEIGHT / 2 - state.hero.y));
                context.globalAlpha *= 0.6;
                context.fillStyle = '#000';
                context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            context.restore();
            renderDisc(context, state.hero.disc);
            renderDiscCenter(context, state.hero.disc);
        }
        for (const loot of state.loot) {
            if (loot === state.activeLoot) {
                continue;
            }
            loot.render(context, state);
        }
        state.activeLoot?.render(context, state);
        for (const enemy of state.enemies) {
            enemy.definition.render(context, state, enemy);
        }
        for (const enemy of state.enemies) {
            renderEnemyLifebar(context, enemy);
        }
        renderHero(context, state, state.hero);
        for (const bullet of state.heroBullets) {
            renderHeroBullet(context, bullet);
        }
        for (const bullet of state.enemyBullets) {
            renderEnemyBullet(context, bullet);
        }
        for (const fieldText of state.fieldText) {
            renderFieldText(context, fieldText);
        }
    context.restore();
    context.beginPath();
    context.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, SIGHT_RADIUS, 0, 2 * Math.PI, true);
    context.fillStyle = '#000';
    context.fill();

    renderHUD(context, state);
}

function renderHUD(context: CanvasRenderingContext2D, state: GameState): void {
    if (state.paused) {
        context.save();
            context.globalAlpha *= 0.6;
            context.fillStyle = 'black';
            context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        context.restore();

        /*context.fillStyle = 'white';
        context.textBaseline = 'middle';
        context.textAlign = 'center';
        context.font = '32px sans-serif';
        context.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);*/
    }

    const minimapRect = state.paused ? largeMapRect : smallMapRect;
    context.fillStyle = 'black';
    context.fillRect(minimapRect.x, minimapRect.y, minimapRect.w, minimapRect.h);
    context.drawImage(mapCanvas,
        minimapSize / 2 + state.hero.x / mapScale - minimapRect.w / 2,
        minimapSize / 2  + state.hero.y / mapScale - minimapRect.h / 2,
        minimapRect.w, minimapRect.h,
        minimapRect.x, minimapRect.y, minimapRect.w, minimapRect.h
    );
    context.fillStyle = '#08F';
    context.fillRect(minimapRect.x + minimapRect.w / 2 - 3, minimapRect.y + minimapRect.h / 2 - 3, 6, 6);
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


    let y = CANVAS_HEIGHT - 20;
    const displayedWeaponTypes = state.paused ? weaponTypes : [state.hero.equipment.weapon.weaponType];
    for (const weaponType of displayedWeaponTypes) {
        const weaponXpRect: Rect = {x: 5, y, h: 10, w: 160};
        const weaponProficiency = getWeaponProficiency(state, weaponType);
        const requiredWeaponXp = getExperienceForNextWeaponLevel(weaponProficiency.level);
        renderBar(context, weaponXpRect, weaponProficiency.experience / requiredWeaponXp, 'orange', '#888');
        context.fillStyle = 'white';
        context.textBaseline = 'middle';
        context.textAlign = 'left';
        context.font = '16px sans-serif';
        context.fillText(weaponTypeLabels[weaponType] + ' skill ' + weaponProficiency.level, 5, y - 8);
        y -= 30
    }

    context.fillStyle = 'white';
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = '16px sans-serif';
    context.fillText('Armor ' + state.hero.armor, 5, y - 8);


    context.strokeStyle = 'red';
    context.fillStyle = 'red';
    for (let i = 0; i < BASE_MAX_POTIONS; i++) {
        if (i < state.hero.potions) {
            context.fillRect(5 + i * 15, experienceRect.y + experienceRect.h + 5, 10, 15);
        }
        context.strokeRect(5 + i * 15, experienceRect.y + experienceRect.h + 5, 10, 15);
    }

    const boss = state.hero.disc?.boss;
    if (!state.paused && boss) {
        const lifeRect: Rect = {x: 210, y: CANVAS_HEIGHT - 30, h: 24, w: CANVAS_WIDTH - 420};
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
        renderInventorySlot(context, slot);
        if (slot.item && isPointInRect(slot, state.mouse)) {
            hoverItem = slot.item;
        }
    }
    if (hoverItem) {
        let equippedItem: Item|undefined;
        if (hoverItem.type === 'weapon') {
            equippedItem = state.hero.equipment.weapon;
        }
        if (hoverItem.type === 'armor') {
            equippedItem = state.hero.equipment.armor;
        }
        renderItemDetails(context, hoverItem, state.mouse, equippedItem);
    }
}

function renderBar(
    context: CanvasRenderingContext2D,
    {x, y, w, h}: Rect,
    p: number,
    fillColor: string,
    backColor = 'black'
): void {
    context.fillStyle = backColor;
    context.fillRect(x, y, w, h);
    context.fillStyle = fillColor;
    context.fillRect(x, y, w * Math.max(0, Math.min(1,p)), h);
}

function renderPortal(context: CanvasRenderingContext2D, state: GameState, portal: Portal): void {
    const isActive = !state.activeLoot && doCirclesIntersect(state.hero, portal);
    fillCircle(context, portal, isActive ? '#BBB' : '#666');
    fillCircle(context, {...portal, radius: portal.radius * 0.9}, '#000');
    context.fillStyle = isActive ? '#FFF' : '#88F';
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    context.font = '16px sans-serif';
    context.fillText(`Level ` + portal.level, portal.x, portal.y - 10);
    context.fillText(portal.name, portal.x, portal.y + 10);
}

function renderEnemyLifebar(context: CanvasRenderingContext2D, enemy: Enemy): void {
    if (enemy.life < enemy.maxLife) {
        let color = '#0F0';
        if (enemy.life <= enemy.maxLife / 4) {
            color = '#F00';
        } else if (enemy.life <= enemy.maxLife / 2) {
            color = '#F80';
        }
        renderBar(context, {x: enemy.x - 15, y: enemy.y - enemy.radius - 8, w: 30, h: 6}, enemy.life / enemy.maxLife, color);
    }
}
function renderEnemyBullet(context: CanvasRenderingContext2D, bullet: Bullet): void {
    fillCircle(context, bullet, 'red');
}
function renderHeroBullet(context: CanvasRenderingContext2D, bullet: Bullet): void {
    fillCircle(context, bullet, 'green');
}
function renderHero(context: CanvasRenderingContext2D, state: GameState, hero: Hero): void {
    if (hero.attackCooldown > state.fieldTime && hero.attackChargeLevel >= 2) {
        // While charged attack still applies, draw an orange halo.
        context.save();
            context.globalAlpha *= (0.45 + 0.15 * Math.sin(state.fieldTime / 100));
            const chargeRadius = hero.radius * 1.2;
            fillCircle(context, {x: hero.x, y: hero.y, radius: chargeRadius}, 'orange');
        context.restore()
    } else if (hero.chargingLevel >= 2) {
        context.save();
            const color = hero.chargingLevel >= 2 ? 'red' : 'orange';
            context.globalAlpha *= (0.45 + 0.15 * Math.sin(state.fieldTime / 100));
            const chargeRadius = 2 * Math.floor(hero.chargingLevel);
            fillCircle(context, {x: hero.x, y: hero.y, radius: hero.radius + chargeRadius}, color);
        context.restore()
    }
    context.save();
        if (hero.life <= 0) {
            context.globalAlpha *= 0.5;
        } else if (hero.recentDamageTaken) {
            const fadeAmount = 0.2 + 0.3 * hero.recentDamageTaken / (hero.maxLife / 2);
            //context.globalAlpha *= (1 - fadeAmount / 2 + fadeAmount * Math.sin(state.fieldTime / 80));
            context.globalAlpha *= (1 - fadeAmount);
        }
        fillCircle(context, hero, 'blue');
    context.restore();

    // Debug code to render charge level on hero
    /*context.fillStyle = 'white';
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    context.font = '16px sans-serif';
    context.fillText(state.hero.chargingLevel.toFixed(2), hero.x, hero.y);*/
}

function renderFieldText(context: CanvasRenderingContext2D, fieldText: FieldText): void {
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    let size = 20;
    if (fieldText.time < 300) {
        size = 50 - 25 * fieldText.time / 300;
    }
    context.font = `${size}px bold sans-serif`;
    if (fieldText.borderColor) {
        context.fillStyle = fieldText.borderColor;
        /*context.fillText(fieldText.text, fieldText.x - 1, fieldText.y - 1);
        context.fillText(fieldText.text, fieldText.x - 1, fieldText.y + 1);
        context.fillText(fieldText.text, fieldText.x + 1, fieldText.y - 1);
        context.fillText(fieldText.text, fieldText.x + 1, fieldText.y + 1);*/
        context.fillText(fieldText.text, fieldText.x - 1, fieldText.y);
        context.fillText(fieldText.text, fieldText.x + 1, fieldText.y);
        context.fillText(fieldText.text, fieldText.x, fieldText.y + 1);
        context.fillText(fieldText.text, fieldText.x, fieldText.y - 1);
    }
    /*if (fieldText.borderColor) {
        context.strokeStyle = fieldText.borderColor;
        context.strokeText(fieldText.text, fieldText.x, fieldText.y);
    }*/
    if (fieldText.color) {
        context.fillStyle = fieldText.color;
        context.fillText(fieldText.text, fieldText.x, fieldText.y);
    }
}

const discDepth = 40;
function renderDiscEdge1(context: CanvasRenderingContext2D, disc: Disc): void {
    context.fillStyle = '#888';
    //context.fillRect(disc.x - disc.radius, disc.y, disc.radius * 2, discDepth);
    context.beginPath();
    //context.moveTo(disc.x - disc.radius, disc.y);
    //context.lineTo(disc.x - disc.radius, disc.y + discDepth);
    context.arc(disc.x, disc.y + discDepth, disc.radius, 0, Math.PI);
    //context.lineTo(disc.x + disc.radius, disc.y);
    context.fill();
}

function renderDiscEdge2(context: CanvasRenderingContext2D, disc: Disc): void {
    context.fillStyle = '#BBB';
    //context.fillRect(disc.x - disc.radius, disc.y, disc.radius * 2, discDepth / 2);
    context.beginPath();
    //context.moveTo(disc.x - disc.radius, disc.y);
    //context.lineTo(disc.x - disc.radius, disc.y + discDepth / 2);
    context.arc(disc.x, disc.y + discDepth / 2, disc.radius, 0, Math.PI);
    //context.lineTo(disc.x + disc.radius, disc.y);
    context.fill();
}

function renderDisc(context: CanvasRenderingContext2D, disc: Disc): void {
    context.fillStyle = disc.boss ? '#FBB' : '#DDD';
    context.beginPath();
    context.arc(disc.x, disc.y, disc.radius, 0, 2 * Math.PI);
    context.fill();
}


function renderDiscCenter(context: CanvasRenderingContext2D, disc: Disc): void {
    context.fillStyle = disc.boss ? '#FCC' : '#FFF';
    context.beginPath();
    context.arc(disc.x, disc.y, disc.radius / 2, 0, 2 * Math.PI);
    context.fill();
}
