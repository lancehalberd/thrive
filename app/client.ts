import { chaser } from 'app/enemies/chaser';
import { circler } from 'app/enemies/circler';
import { lord } from 'app/enemies/lord';
import { turret } from 'app/enemies/turret';
import { checkToDropBasicLoot } from 'app/loot';
import { updateInventory } from 'app/inventory';
import { render } from 'app/render/renderGame';
import { mainCanvas, mainContext } from 'app/utils/canvas';
import { addDamageNumber, applyArmorToDamage } from 'app/utils/combat';
import { createTreeDungeon, getTreeDungeonPortal, startDungeon } from 'app/utils/dungeon';
import { createEnemy } from 'app/utils/enemy';
import { doCirclesIntersect, findClosestDisc, getClosestElement, getTargetVector } from 'app/utils/geometry';
import { damageHero, gainExperience, gainItemExperience, setDerivedHeroStats } from 'app/utils/hero';
import { getMousePosition, isMouseDown, isRightMouseDown } from 'app/utils/mouse';
import { isGameKeyDown, updateKeyboardState, wasGameKeyPressed } from 'app/utils/userInput';
import Random from 'app/utils/Random';
import {
    BASE_MAX_POTIONS,
    BASE_XP,
    CANVAS_HEIGHT, CANVAS_SCALE, CANVAS_WIDTH,
    FRAME_LENGTH,
    GAME_KEY,
    HERO_DAMAGE_FRAME_COUNT,
} from 'app/constants';
import { initializeGame } from 'app/initialize';
import { allWeapons } from 'app/weapons';

const testDiscs: Disc[] = [
    {x: 500, y: 500, radius: 500, links: []},
    {x: 1200, y: 1200, radius: 800, links: []},
    {x: 500, y: -200, radius: 500, links: []},
]

let state: GameState = {
    fieldTime: 0,
    hero: {
        level: 1,
        experience: 0,
        speed: 100,
        x: 500,
        y: 500,
        radius: 15,
        theta: 0,
        damageHistory: [],
        recentDamageTaken: 0,
        equipment: {
            weapon: Random.element(allWeapons)[0],
        },
        weapons: [],
        armors: [],
        // Derived stats will get set later.
        life: 0,
        maxLife: 0,
        armor: 0,
        damage: 0,
        attacksPerSecond: 0,
        attackCooldown: 0,
        chargingLevel: 1,
        attackChargeLevel: 1,
        potions: BASE_MAX_POTIONS,
    },
    heroBullets: [],
    enemies: [],
    loot: [],
    portals: [],
    enemyBullets: [],
    fieldText: [],
    activeDiscs: testDiscs,
    visibleDiscs: testDiscs,
    gameHasBeenInitialized: false,
    paused: false,
    mouse: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        isDown: false,
        wasPressed: false,
    },
    keyboard: {
        gameKeyValues: [],
        gameKeysDown: new Set(),
        gameKeysPressed: new Set(),
        mostRecentKeysPressed: new Set(),
        gameKeysReleased: new Set(),
    },
};
// @ts-ignore
window['state'] = state;
function getState(): GameState {
    return state;
}

function update(): void {
    const state = getState();
    if (!state.gameHasBeenInitialized) {
        initializeGame(state);
        setDerivedHeroStats(state);
        startDungeon(state, createTreeDungeon(Math.random(), 2000, 1));
    }
    updateKeyboardState(state);
    const [x, y] = getMousePosition(mainCanvas, CANVAS_SCALE);
    state.mouse.x = x;
    state.mouse.y = y;
    if (isMouseDown()) {
        state.mouse.wasPressed = !state.mouse.isDown;
        state.mouse.isDown = true;
    } else {
        state.mouse.wasPressed = false;
        state.mouse.isDown = false;
    }
    if (wasGameKeyPressed(state, GAME_KEY.MENU)) {
        state.paused = !state.paused;
    }

    updateInventory(state);
    if (state.paused) {
        return;
    }
    state.fieldTime += FRAME_LENGTH;
    if (state.hero.life <= 0) {
        return;
    }
    updateHero(state);
    updateEnemies(state);
    updateHeroBullets(state);
    updateEnemyBullets(state);
    state.fieldText = state.fieldText.filter(t => t.expirationTime > state.fieldTime);
    for (const fieldText of state.fieldText) {
        fieldText.x += fieldText.vx;
        fieldText.y += fieldText.vy;
        fieldText.time += FRAME_LENGTH;
    }


    if (state.enemies.filter(e => !e.master).length < 0) {
        for (const disc of state.activeDiscs) {
            if (disc === state.hero.disc) {
                continue;
            }
            if (Math.random() < 0.05) {
                const definition: EnemyDefinition = Random.element([turret, chaser, chaser, circler, circler, lord]);
                const radius = definition === turret ? disc.radius / 8 : disc.radius / 4;
                const theta = Math.random() * 2 * Math.PI;
                let level = Math.floor(state.hero.level / 2);
                while (Math.random() < 0.5 && level < state.hero.level) {
                    level++;
                }
                const enemy = createEnemy(
                    disc.x + radius * Math.cos(theta),
                    disc.y + radius * Math.sin(theta),
                    definition,
                    level
                );
                state.enemies.push(enemy);
            }
        }
    }

    state.activeLoot = getClosestElement(state.hero, state.loot);
    if (state.activeLoot && getTargetVector(state.hero, state.activeLoot).distance2 >= (state.activeLoot.radius + state.hero.radius + 10) ** 2) {
        delete state.activeLoot;
    }
    if (state.activeLoot && wasGameKeyPressed(state, GAME_KEY.ACTIVATE)) {
        state.activeLoot.activate(state);
        state.loot.splice(state.loot.indexOf(state.activeLoot), 1);
        delete state.activeLoot;
    } else if (state.activeLoot && wasGameKeyPressed(state, GAME_KEY.SELL)) {
        gainItemExperience(state, state.activeLoot.getLevel());
        state.loot.splice(state.loot.indexOf(state.activeLoot), 1);
        delete state.activeLoot;
    }
}

function updateHero(state: GameState): void {
    const hero = state.hero;
    // Hero damage frames
    hero.damageHistory.unshift(0);
    if (hero.damageHistory.length > HERO_DAMAGE_FRAME_COUNT) {
        const oldDamage = hero.damageHistory.pop()!;
        hero.recentDamageTaken -= oldDamage;
    }

    // Hero movement
    let dx = 0, dy = 0;
    if (isGameKeyDown(state, GAME_KEY.UP)) {
        dy--;
    }
    if (isGameKeyDown(state, GAME_KEY.DOWN)) {
        dy++;
    }
    if (isGameKeyDown(state, GAME_KEY.LEFT)) {
        dx--;
    }
    if (isGameKeyDown(state, GAME_KEY.RIGHT)) {
        dx++;
    }
    const m = Math.sqrt(dx * dx + dy * dy);
    if (m > 1) {
        dx /= m;
        dy /= m;
    }
    const speed = isRightMouseDown() ? hero.speed : 1.5 * hero.speed;
    hero.x += dx * speed / FRAME_LENGTH;
    hero.y += dy * speed / FRAME_LENGTH;

    // Hero attack
    const {x, y} = state.mouse;
    let aimDx = x - CANVAS_WIDTH / 2, aimDy = y - CANVAS_HEIGHT / 2;
    hero.theta = Math.atan2(aimDy, aimDx);
    const weapon = hero.equipment.weapon;
    const attacksPerSecond = weapon.attacksPerSecond * hero.attacksPerSecond;
    if (isMouseDown()) {
        const attackCooldownDuration = 1000 / attacksPerSecond;
        if (hero.attackCooldown <= state.fieldTime) {
            hero.attackCooldown = state.fieldTime + attackCooldownDuration;
            hero.attackChargeLevel = Math.max(1, Math.floor(hero.chargingLevel));
            state.hero.chargingLevel = 0;
        }
        const attackTime = attackCooldownDuration - (hero.attackCooldown - state.fieldTime);
        for (const shot of weapon.shots) {
            const shotTime = attackCooldownDuration * (shot.timingOffset ?? 0);
            if (shotTime >= attackTime - FRAME_LENGTH / 2 && shotTime < attackTime + FRAME_LENGTH / 2) {
                state.heroBullets.push(shot.generateBullet(state, hero, weapon));
            }
        }
    } else {
        hero.chargingLevel = Math.min(
            weapon.chargeLevel,
            // Charging gets slower for each charge level.
            //hero.chargingLevel + FRAME_LENGTH * attacksPerSecond / 1000 / Math.floor(hero.chargingLevel + 1)
            hero.chargingLevel + FRAME_LENGTH * attacksPerSecond / 1000
        );
    }

    if (!state.hero.disc?.boss) {
        assignToDisc(state.hero, state.activeDiscs);
    }
    constrainToDisc(state.hero, state.hero.disc);

    for (const portal of state.portals) {
        const isActive = !state.activeLoot && doCirclesIntersect(state.hero, portal);
        if (isActive && wasGameKeyPressed(state, GAME_KEY.ACTIVATE)) {
            console.log('activate');
            portal.activate(state);
        }
    }

    if (hero.potions > 0 && hero.life < hero.maxLife && wasGameKeyPressed(state, GAME_KEY.POTION)) {
        hero.life = Math.min(hero.maxLife, Math.ceil(hero.life + hero.maxLife * 0.2));
        hero.potions--;
    }
}



function updateEnemies(state: GameState): void {
    const boss = state.hero.disc?.boss;
    for (const enemy of state.enemies) {
        // Freeze enemies outside of the boss fight.
        if (boss && enemy.disc?.boss !== boss) {
            continue;
        }
        // Freeze bosses that are not activated.
        if (!boss && enemy.disc?.boss === enemy) {
            continue;
        }
        enemy.modeTime += FRAME_LENGTH;
        enemy.definition.update(state, enemy);
        // No changing discs during boss fights.
        if (!boss) {
            assignToDisc(enemy, state.activeDiscs);
        }
        constrainToDisc(enemy, enemy.disc);
    }
}

function updateHeroBullets(state: GameState): void {
    const activeBullets = state.heroBullets.filter(b => b.expirationTime >= state.fieldTime);
    state.heroBullets = [];
    const boss = state.hero.disc?.boss;
    for (const bullet of activeBullets) {
        bullet.x += bullet.vx / FRAME_LENGTH;
        bullet.y += bullet.vy / FRAME_LENGTH;
        let bulletAbsorbed = false;
        for (const enemy of state.enemies) {
            // Freeze enemies outside of the boss fight.
            if (boss && enemy.disc?.boss !== boss) {
                continue;
            }
            // Freeze bosses that are not activated.
            if (!boss && enemy.disc?.boss === enemy) {
                continue;
            }
            if (bullet.hitTargets.has(enemy)) {
                continue;
            }
            if (doCirclesIntersect(enemy, bullet)) {
                bullet.hitTargets.add(enemy);
                const damage = applyArmorToDamage(state, bullet.damage, enemy.armor);
                enemy.life -= damage;
                addDamageNumber(state, enemy, damage);
                if (enemy.life <= 0) {
                    const experiencePenalty = Math.min(1, Math.max(0, (state.hero.level - enemy.level) * 0.1));
                    gainExperience(state,
                        Math.ceil(BASE_XP * (1 - experiencePenalty) * Math.pow(1.2, enemy.level) * (enemy.definition.experienceFactor ?? 1))
                    );
                    checkToDropBasicLoot(state, enemy);
                    if (enemy.disc?.boss === enemy) {
                        delete enemy.disc.boss;
                        state.portals.push(getTreeDungeonPortal(enemy.disc.x, enemy.disc.y, enemy.level - 1, Math.random()));
                    }
                } else {
                    // Shots are not absorbed by defeated enemies.
                    bulletAbsorbed = !bullet.isEnemyPiercing;
                }
            }
        }
        if (!bulletAbsorbed) {
            state.heroBullets.push(bullet);
        }
    }
    state.enemies = state.enemies.filter(e => e.life > 0);
}

function updateEnemyBullets(state: GameState): void {
    const activeBullets = state.enemyBullets.filter(b => b.expirationTime >= state.fieldTime);
    state.enemyBullets = [];
    for (const bullet of activeBullets) {
        bullet.x += bullet.vx / FRAME_LENGTH;
        bullet.y += bullet.vy / FRAME_LENGTH;
        let hitTarget = false;
        if (doCirclesIntersect(state.hero, bullet)) {
            hitTarget = true;
            damageHero(state, bullet.damage);
        }
        if (!hitTarget) {
            state.enemyBullets.push(bullet);
        }
    }
    state.enemies = state.enemies.filter(e => e.life > 0);
}

function assignToDisc(geometry: Geometry, discs: Disc[]) {
    geometry.disc = findClosestDisc(geometry, discs);
}

function constrainToDisc(geometry: Geometry, disc?: Disc) {
    if (!disc) {
        return;
    }
    const dx =  geometry.x - disc.x, dy = geometry.y - disc.y;
    const distance2 = dx * dx + dy * dy;
    if (distance2 > disc.radius * disc.radius) {
        const m = Math.sqrt(distance2);
        geometry.x = disc.x + disc.radius * dx / m;
        geometry.y = disc.y + disc.radius * dy / m;
    }

}


function renderLoop() {
    try {
        window.requestAnimationFrame(renderLoop);
        const state = getState();
        render(mainContext, state);
    } catch (e) {
        console.log(e);
        debugger;
    }
}
renderLoop();
setInterval(update, FRAME_LENGTH);

