import { FIELD_CENTER, CANVAS_HEIGHT, CANVAS_WIDTH, SIGHT_RADIUS } from 'app/constants';
import { fillCircle, renderBar } from 'app/render/renderGeometry';
import { renderHUD } from 'app/render/renderHUD';
import { getRightAnalogDeltas } from 'app/utils/userInput'
import { doCirclesIntersect } from 'app/utils/geometry';
import { getHeroShaveRadius } from 'app/utils/hero';


export function render(context: CanvasRenderingContext2D, state: GameState): void {
    context.fillStyle = '#000';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.save();
        context.translate(FIELD_CENTER.x - state.hero.x, FIELD_CENTER.y - state.hero.y);
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

        for (const hole of state.holes) {
            fillCircle(context, hole, 'black');
            let theta = Math.atan2(discDepth / 4, Math.sqrt(hole.radius**2 - discDepth ** 2 / 16));
            context.fillStyle = '#BBB'; //disc.topEdgeColor ?? '#BBB';
            context.beginPath();
            context.arc(hole.x, hole.y - 2, hole.radius, 0, -Math.PI, true);
            //context.lineTo(hole.x - hole.radius, hole.y + discDepth / 2);
//125 0.1606906529519106
// 75 0.26993279583340346
// 100 0.2013579207903308
            //console.log(hole.radius, theta);
            context.arc(hole.x, hole.y + discDepth / 2, hole.radius, -Math.PI + theta, - theta);
            context.fill();

            context.beginPath();
            context.fillStyle = '#888'; // disc.bottomEdgeColor ?? '#888';
            context.arc(hole.x, hole.y + discDepth / 2 - 2, hole.radius, -theta, -Math.PI + theta, true);
            theta = Math.atan2(discDepth / 2, Math.sqrt(hole.radius**2 - discDepth ** 2 / 4));
            //context.lineTo(hole.x - hole.radius, hole.y + discDepth);
            context.arc(hole.x, hole.y + discDepth, hole.radius, -Math.PI + theta, - theta);
            context.fill();
            /*context.save();
                context.globalAlpha *= 0.4;
                context.fillStyle = 'black'
                context.beginPath();
                context.arc(hole.x, hole.y, hole.radius, -Math.PI / 2, Math.PI / 6, true);
                context.fill();
            context.restore();*/
        }


        for (const portal of state.portals) {
            renderPortal(context, state, portal);
        }
        if (state.hero?.disc?.boss) {
            context.save();
                context.translate(-(FIELD_CENTER.x - state.hero.x), -(FIELD_CENTER.y - state.hero.y));
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
    context.arc(FIELD_CENTER.x, FIELD_CENTER.y, state.sightRadius, 0, 2 * Math.PI, true);
    context.fillStyle = '#000';
    context.fill();

    if (state.isUsingXbox) {
        const [dx, dy] = getRightAnalogDeltas(state);
        /*const x = FIELD_CENTER.x + dx * 100, y = FIELD_CENTER.y + dy * 100;
        context.beginPath();
        context.arc(x, y, 15, 0, 2 * Math.PI, true);
        context.strokeStyle = 'blue';
        context.stroke();*/

        /*context.beginPath();
        context.arc(x, y, 2, 0, 2 * Math.PI, true);
        context.fillStyle = 'blue';
        context.fill();*/

        context.save();
        context.beginPath();
        context.setLineDash([10, 15]);
        context.strokeStyle = 'blue';
        context.moveTo(FIELD_CENTER.x, FIELD_CENTER.y);
        context.lineTo(SIGHT_RADIUS * dx + FIELD_CENTER.x, SIGHT_RADIUS * dy + FIELD_CENTER.y);
        context.stroke();
        context.restore();
    }

    renderHUD(context, state);
}



function renderPortal(context: CanvasRenderingContext2D, state: GameState, portal: Portal): void {
    const isActive = !state.activeLoot && doCirclesIntersect(state.hero, portal);
    fillCircle(context, portal, isActive ? '#BBB' : '#666');
    fillCircle(context, {...portal, radius: portal.radius * 0.9}, '#000');
    context.fillStyle = isActive ? '#FFF' : '#88F';
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    context.font = '16px sans-serif';
    if (portal.dungeon) {
        context.fillText(`Level ` + portal.dungeon.level, portal.x, portal.y - 10);
        context.fillText(portal.name, portal.x, portal.y + 10);
    } else {
        context.fillText(portal.name, portal.x, portal.y);
    }

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
    if (bullet.warningTime > 0) {
        context.fillStyle = 'red';
        context.beginPath();
        context.arc(bullet.x, bullet.y, bullet.radius, 0, 2 * Math.PI);
        context.arc(bullet.x, bullet.y, bullet.radius - 2, 0, 2 * Math.PI, true);
        context.fill();
    } else {
        if (bullet.radius > 15) {
            context.save();
                context.globalAlpha *= 0.5;
                fillCircle(context, bullet, 'red');
            context.restore();
        } else {
            fillCircle(context, bullet, 'red');
        }
    }
}
function renderHeroBullet(context: CanvasRenderingContext2D, bullet: Bullet): void {
    fillCircle(context, bullet, 'green');
    context.beginPath();
    context.lineWidth = 1;
    context.strokeStyle = 'white';
    context.arc(bullet.x, bullet.y, bullet.radius, 0, 2 * Math.PI);
    context.stroke();
}
function renderHero(context: CanvasRenderingContext2D, state: GameState, hero: Hero): void {
    if (hero.attackChargeDuration > 0 && hero.attackChargeLevel >= 2) {
        // While charged attack still applies, draw an orange halo.
        context.save();
            context.globalAlpha *= (0.6 + 0.15 * Math.sin(state.fieldTime / 100));
            const chargeRadius = hero.radius * 1.3;
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
        context.beginPath();
        context.strokeStyle = 'lightblue';
        context.lineWidth = 3;
        if (hero.equipment.armor.armorType === 'heavyArmor') {
            context.lineWidth = 5;
        } else if (hero.equipment.armor.armorType === 'lightArmor') {
            context.lineWidth = 1;
        }
        context.arc(hero.x, hero.y, hero.radius * 0.8, 0, 2 * Math.PI);
        context.stroke();
        for (const shot of hero.equipment.weapon.shots) {
            const bullet = shot.generateBullet(state, hero, hero.equipment.weapon);
            bullet.x += bullet.vx / 20;
            bullet.y += bullet.vy / 20;
            //bullet.radius /= 2;
            context.beginPath();
            context.lineWidth = 1;
            context.strokeStyle = 'white';
            context.arc(bullet.x, bullet.y, bullet.radius, 0, 2 * Math.PI);
            context.stroke();
            //fillCircle(context, bullet, 'black');
        }
    context.restore();

    const shaveRadius = getHeroShaveRadius(state);
    if (shaveRadius > 0) {
        context.save();
            context.beginPath();
            context.lineWidth = 0;
            context.setLineDash([5, 10]);
            context.strokeStyle = 'blue';
            context.arc(hero.x, hero.y, hero.radius + shaveRadius, 0, 2 * Math.PI);
            context.stroke();
        context.restore();
    }
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
    context.fillStyle = disc.bottomEdgeColor ?? '#888';
    //context.fillRect(disc.x - disc.radius, disc.y, disc.radius * 2, discDepth);
    context.beginPath();
    //context.moveTo(disc.x - disc.radius, disc.y);
    //context.lineTo(disc.x - disc.radius, disc.y + discDepth);
    context.arc(disc.x, disc.y + discDepth, disc.radius, 0, Math.PI);
    //context.lineTo(disc.x + disc.radius, disc.y);
    context.fill();
}

function renderDiscEdge2(context: CanvasRenderingContext2D, disc: Disc): void {
    context.fillStyle = disc.topEdgeColor ??  '#BBB';
    //context.fillRect(disc.x - disc.radius, disc.y, disc.radius * 2, discDepth / 2);
    context.beginPath();
    //context.moveTo(disc.x - disc.radius, disc.y);
    //context.lineTo(disc.x - disc.radius, disc.y + discDepth / 2);
    context.arc(disc.x, disc.y + discDepth / 2, disc.radius, 0, Math.PI);
    //context.lineTo(disc.x + disc.radius, disc.y);
    context.fill();
}

function renderDisc(context: CanvasRenderingContext2D, disc: Disc): void {
    context.fillStyle = disc.boss ? '#FBB' : disc.color ?? '#DDD';
    context.beginPath();
    context.arc(disc.x, disc.y, disc.radius, 0, 2 * Math.PI);
    context.fill();
}


function renderDiscCenter(context: CanvasRenderingContext2D, disc: Disc): void {
    context.fillStyle = disc.boss ? '#FCC' : disc.centerColor ?? '#FFF';
    context.beginPath();
    context.arc(disc.x, disc.y, disc.radius / 2, 0, 2 * Math.PI);
    context.fill();
}
