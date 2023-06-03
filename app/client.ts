import { checkToDropBasicLoot, dropEnchantmentLoot } from 'app/loot';
import { updateInventory } from 'app/inventory';
import { render } from 'app/render/renderGame';
import { mainCanvas, mainContext } from 'app/utils/canvas';
import { addDamageNumber, applyArmorToDamage } from 'app/utils/combat';
import {
    clearNearbyEnemies,
    addDungeonPortalToDisc,
    addOverworldPortalToDisc,
    updateActiveCells,
} from 'app/utils/dungeon';
import { doCirclesIntersect, findClosestDisc, getClosestElement, getTargetVector } from 'app/utils/geometry';
import { damageHero, gainExperience, gainWeaponExperience, setDerivedHeroStats } from 'app/utils/hero';
import { getMousePosition, isMouseDown, isRightMouseDown } from 'app/utils/mouse';
import { getRightAnalogDeltas, isGameKeyDown, isKeyboardKeyDown, updateKeyboardState, wasGameKeyPressed, KEY } from 'app/utils/userInput';
import Random from 'app/utils/Random';
import { mediumArmors } from 'app/armor';
import {
    BASE_MAX_POTIONS,
    BASE_XP,
    CANVAS_HEIGHT, CANVAS_SCALE, CANVAS_WIDTH,
    CELL_SIZE,
    FIELD_CENTER,
    FRAME_LENGTH,
    GAME_KEY,
    HERO_DAMAGE_FRAME_COUNT,
} from 'app/constants';
import { initializeGame } from 'app/initialize';
import { allWeapons } from 'app/weapons';

let state: GameState = {
    fieldTime: 0,
    hero: {
        level: 1,
        experience: 0,
        speed: 100,
        x: CELL_SIZE / 2,
        y: - CELL_SIZE / 2,
        overworldX: CELL_SIZE / 2,
        overworldY: - CELL_SIZE / 2,
        radius: 15,
        theta: 0,
        damageHistory: [],
        recentDamageTaken: 0,
        equipment: {
            weapon: Random.element(allWeapons)[0],
            armor: mediumArmors[0],
        },
        weapons: [],
        weaponProficiency: {},
        armors: [],
        enchantments: [],
        // Derived stats will get set later.
        life: 10,
        maxLife: 10,
        baseArmor: 0,
        armor: 0,
        damage: 0,
        attacksPerSecond: 0,
        attackCooldown: 0,
        chargingLevel: 1,
        attackChargeLevel: 1,
        attackChargeDuration: 0,
        potions: BASE_MAX_POTIONS,
        isShooting: false,
        // Base crit damage/chance is on weapons, this just stores
        // bonuses from enchantments+weapon proficiencies.
        critChance: 0,
        critDamage: 0,
        chargeDamage: 0,
        armorShredEffect: 0,
        potionEffect: 1,
    },
    heroBullets: [],
    enemies: [],
    loot: [],
    portals: [],
    enemyBullets: [],
    fieldText: [],
    worldSeed: Math.random(),
    activeCells: [],
    recentCells: [],
    cellMap: new Map(),
    activeDiscs: [],
    visibleDiscs: [],
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
    menuRow: 0,
    menuColumn: 0,
    menuEquipmentSelected: false,
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
        clearNearbyEnemies(state);
        // startDungeon(state, createTreeDungeon(Math.random(), 2000, 1));
    }
    updateKeyboardState(state);
    if (state.isUsingXbox) {
        const [dx, dy] = getRightAnalogDeltas(state);
        state.hero.theta = Math.atan2(dy, dx);
        state.hero.isShooting = isGameKeyDown(state, GAME_KEY.SHOOT);
    } else {
        const [x, y] = getMousePosition(mainCanvas, CANVAS_SCALE);
        let aimDx = x - FIELD_CENTER.x, aimDy = y - FIELD_CENTER.y;
        state.hero.theta = Math.atan2(aimDy, aimDx);
        state.mouse.x = x;
        state.mouse.y = y;
        if (isMouseDown()) {
            state.mouse.wasPressed = !state.mouse.isDown;
            state.mouse.isDown = true;
        } else {
            state.mouse.wasPressed = false;
            state.mouse.isDown = false;
            state.hero.isShooting = false;
        }
        if (state.mouse.wasPressed) {
            state.hero.isShooting = true;
        }
    }
    if (wasGameKeyPressed(state, GAME_KEY.MENU)) {
        state.paused = !state.paused;
    }
    if (isKeyboardKeyDown(KEY.SHIFT) && isKeyboardKeyDown(KEY.B)) {
        const bossDisc = state.activeDiscs.find(d => d.boss);
        if (bossDisc) {
            state.hero.x = bossDisc.x;
            state.hero.y = bossDisc.y;
        }
    }
    if (isKeyboardKeyDown(KEY.SHIFT) && isKeyboardKeyDown(KEY.K)) {
        for (const enemy of state.enemies) {
            if (enemy.disc === state.hero.disc) {
                defeatEnemy(state, enemy);
            }
        }
        state.enemies = state.enemies.filter(e => e.life > 0);
    }

    updateInventory(state);
    if (state.paused) {
        return;
    }
    state.fieldTime += FRAME_LENGTH;
    if (state.hero.life <= 0) {
        return;
    }
    updateActiveCells(state);
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
    state.activeLoot = getClosestElement(state.hero, state.loot);
    if (state.activeLoot && getTargetVector(state.hero, state.activeLoot).distance2 >= (state.activeLoot.radius + state.hero.radius + 10) ** 2) {
        delete state.activeLoot;
    }
    if (state.activeLoot && wasGameKeyPressed(state, GAME_KEY.ACTIVATE)) {
        state.activeLoot.activate(state);
        state.activeLoot.disc.loot.splice(state.activeLoot.disc.loot.indexOf(state.activeLoot), 1);
        delete state.activeLoot;
    } else if (state.activeLoot && wasGameKeyPressed(state, GAME_KEY.SELL)) {
        state.activeLoot.sell();
        state.activeLoot.disc.loot.splice(state.activeLoot.disc.loot.indexOf(state.activeLoot), 1);
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
    // Currently walking is always disabled, but we can add a key for it later if we want.
    const isWalking = false;
    const speed = isWalking ? hero.speed : 1.5 * hero.speed;
    hero.x += dx * speed / FRAME_LENGTH;
    hero.y += dy * speed / FRAME_LENGTH;

    // Hero attack
    const weapon = hero.equipment.weapon;
    const attacksPerSecond = weapon.attacksPerSecond * hero.attacksPerSecond;


    // chargingLevel increases as long as the hero
    // Default charge speed is 1 charge per 20 seconds.
    gainAttackCharge(state, FRAME_LENGTH / 20000);

    if (state.hero.attackChargeLevel > 1) {
        state.hero.attackChargeDuration -= FRAME_LENGTH;
        if (state.hero.attackChargeDuration <= 0) {
            state.hero.attackChargeLevel = 1;
        }
    } else if (state.hero.chargingLevel >= 2 &&
        (isGameKeyDown(state, GAME_KEY.SPECIAL_ATTACK)
            || (state.isUsingKeyboard && isRightMouseDown())
        )
    ) {
        // Charge duration is 2 seconds by default.
        state.hero.attackChargeDuration = 2000;
        state.hero.attackChargeLevel = state.hero.chargingLevel;
        state.hero.chargingLevel = 1;
        // Restart attack pattern when triggering charged attacks.
        hero.attackCooldown = state.fieldTime;
    }
    if (state.hero.isShooting) {
        const attackCooldownDuration = 1000 / attacksPerSecond;
        if (hero.attackCooldown <= state.fieldTime) {
            hero.attackCooldown = state.fieldTime + attackCooldownDuration;
        }
        const attackTime = attackCooldownDuration - (hero.attackCooldown - state.fieldTime);
        for (const shot of weapon.shots) {
            const shotTime = attackCooldownDuration * (shot.timingOffset ?? 0);
            if (shotTime >= attackTime - FRAME_LENGTH / 2 && shotTime < attackTime + FRAME_LENGTH / 2) {
                state.heroBullets.push(shot.generateBullet(state, hero, weapon));
            }
        }
    }

    if (!state.hero.disc?.boss) {
        assignToDisc(state.hero, state.activeDiscs);
    }
    constrainToDisc(state.hero, state.hero.disc);

    for (const portal of state.portals) {
        const isActive = !state.activeLoot && doCirclesIntersect(state.hero, portal);
        if (isActive && wasGameKeyPressed(state, GAME_KEY.ACTIVATE)) {
            portal.activate(state);
        }
    }

    if (hero.potions > 0 && hero.life < hero.maxLife && wasGameKeyPressed(state, GAME_KEY.POTION)) {
        hero.life = Math.min(hero.maxLife, Math.ceil(hero.life + hero.maxLife * 0.2 * hero.potionEffect));
        hero.potions--;
    }
}

function gainAttackCharge(state: GameState, amount: number): void {
    // Cannot gain charge while using a charged attack.
    if (state.hero.attackChargeLevel > 1) {
        return;
    }
    state.hero.chargingLevel = Math.min(state.hero.equipment.weapon.chargeLevel, state.hero.chargingLevel + amount);
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
            if (enemy.isInvulnerable) {
                continue;
            }
            if (enemy.life <= 0) {
                continue;
            }
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
                if (bullet.chargeGain) {
                    gainAttackCharge(state, bullet.chargeGain);
                    // A bullet grants less charge for each additional enemy it hits.
                    bullet.chargeGain /= 2;
                }
                enemy.life -= damage;
                let armorShred = bullet.armorShred;
                if (enemy.armor <= enemy.baseArmor / 2) {
                    armorShred /= 2;
                }
                if (enemy.armor <= enemy.baseArmor / 4) {
                    armorShred /= 2;
                }
                enemy.armor = Math.max(enemy.baseArmor / 10, enemy.armor * (1 - armorShred));
                addDamageNumber(state, enemy, damage, bullet.isCrit);
                if (enemy.life <= 0) {
                    defeatEnemy(state, enemy);
                } else {
                    // Shots are not absorbed by defeated enemies.
                    bulletAbsorbed = !bullet.isEnemyPiercing;
                    enemy.definition.onHit?.(state, enemy, bullet);
                }
            }
        }
        if (!bulletAbsorbed) {
            state.heroBullets.push(bullet);
        }
    }
}

function defeatEnemy(state: GameState, enemy: Enemy): void {
    enemy.life = 0;
    enemy.definition.onDeath?.(state, enemy);
    const experiencePenalty = Math.min(1, Math.max(0, (state.hero.level - enemy.level) * 0.1));
    const experience = BASE_XP * Math.pow(1.2, enemy.level) * (enemy.definition.experienceFactor ?? 1);
    gainExperience(state, Math.ceil(experience * (1 - experiencePenalty)));
    gainWeaponExperience(state, state.hero.equipment.weapon.weaponType, enemy.level, experience);
    checkToDropBasicLoot(state, enemy);
    if (enemy.disc && enemy.definition.portalDungeonType && Math.random() <= (enemy.definition.portalChance ?? 0)) {
         addDungeonPortalToDisc(enemy, enemy.definition.portalDungeonType, enemy.level, Math.random(), enemy.disc);
    }
    if (enemy.disc?.boss === enemy) {
        delete enemy.disc.boss;
        addOverworldPortalToDisc(enemy.disc, enemy.disc);
        // Destroy all boss minions when it is defeated. They will not grant experience as they are not
        // killed by taking shot damage.
        for (const minion of enemy.minions) {
            minion.life = 0;
        }
        const enchantment = enemy.definition.getEnchantment?.(state, enemy);
        if (enchantment) {
            dropEnchantmentLoot(state, enemy.disc, {
                x: enemy.disc.x,
                y: enemy.disc.y + 100,
            }, enchantment)
        }
    }
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

