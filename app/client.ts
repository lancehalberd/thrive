// This file sets a bunch of values on `window` and must be the first thing imported.
import { GAME_KEY } from 'app/constants';


import { addContextMenuListeners } from 'app/contextMenu';
import { checkToDropBasicLoot, dropEnchantmentLoot } from 'app/loot';
import { getHoverInventorySlot, updateInventory } from 'app/inventory';
import { render } from 'app/render/renderGame';
import { uniqueEnchantmentHash } from 'app/uniqueEnchantmentHash';
import { playSound, playTrack, setVolume } from 'app/utils/audio';
import { mainCanvas, mainContext } from 'app/utils/canvas';
import {
    addDamageNumber,
    applyArmorToDamage,
    applySlowEffect,
    damageHero,
    damageHeroOverTime,
    updateSlowEffects,
} from 'app/utils/combat';
import { getBaseEnemyExperience } from 'app/utils/coreCalculations';
import { findClosestDisc } from 'app/utils/disc';
import {
    createDungeon,
    addDungeonPortalToDisc,
    startDungeon,
} from 'app/utils/dungeon';
import { doCirclesIntersect, getClosestElement, getTargetVector } from 'app/utils/geometry';
import { updateGuardSkill } from 'app/utils/guardSkill';
import {
    gainExperience, gainEquipmentExperience, getHeroShaveRadius, getMaxChargeLevel, getMastery, getProficiency,
    refillAllPotions, setDerivedHeroStats, masteryMap,
} from 'app/utils/hero';
import { getMousePosition, isMouseDown, isMiddleMouseDown, isRightMouseDown } from 'app/utils/mouse';
import { addOverworldPortalToDisc, clearNearbyEnemies, returnToOverworld, updateActiveCells } from 'app/utils/overworld';
import { getMovementDeltas, getRightAnalogDeltas, isGameKeyDown, isKeyboardKeyDown, updateKeyboardState, wasGameKeyPressed, KEY } from 'app/utils/userInput';
import Random from 'app/utils/Random';
import { rollWithMissBonus } from 'app/utils/rollWithMissBonus';
import { mediumArmors } from 'app/armor';
import { initializeGame } from 'app/initialize';
import { loadGame } from 'app/saveGame';
import { allWeapons, weaponTypeLabels } from 'app/weapons';

const state: GameState = getInitialState();
// @ts-ignore
window['state'] = state;
function getState(): GameState {
    return state;
}

function getInitialState(): GameState {
    return {
        worldSeed: Math.random(),
        fieldTime: 0,
        hero: {
            // placeholder disc
            disc: {level:1, x: 0, y: 0, radius: 100, name: '', links: [], enemies: [], portals: [], loot: [], holes: []},
            level: 1,
            experience: 0,
            speed: 100,
            x: window.CELL_SIZE / 2,
            y: - window.CELL_SIZE / 2,
            overworldX: window.CELL_SIZE / 2,
            overworldY: - window.CELL_SIZE / 2,
            radius: 20,
            theta: 0,
            damageHistory: [],
            recentDamageTaken: 0,
            lastTimeDamaged: 0,
            equipment: {
                weapon: Random.element(allWeapons.filter(arr => arr.length))[0],
                armor: mediumArmors[0],
            },
            weapons: [],
            proficiency: {},
            mastery: {},
            bossRecords: {},
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
            totalChargeDuration: 2000,
            potions: window.BASE_MAX_POTIONS,
            isShooting: false,
            // Base crit damage/chance is on weapons, this just stores
            // bonuses from enchantments+weapon proficiencies.
            critChance: 0,
            critDamage: 0,
            chargeDamage: 0,
            dropChance: 0,
            dropLevel: 0,
            armorShredEffect: 0,
            potionEffect: 1,
            vx: 0,
            vy: 0,
            uniqueEnchantments: [],
            flags: {},
            guardSkill: {
                cooldownTime: 0,
                charges: 0,
                time: 0,
            },
            frameDamageOverTime: 0,
            slowEffects: [],
        },
        heroBullets: [],
        enemies: [],
        loot: [],
        portals: [],
        holes: [],
        enemyBullets: [],
        fieldText: [],
        activeCells: [],
        recentCells: [],
        cellMap: new Map(),
        activeDiscs: [],
        visibleDiscs: [],
        gameHasBeenInitialized: false,
        paused: false,
        mouse: {
            x: window.CANVAS_WIDTH / 2,
            y: window.CANVAS_HEIGHT / 2,
            isDown: false,
            wasPressed: false,
            isRightDown: false,
            wasRightPressed: false,
        },
        isUsingKeyboard: true,
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
        audio: {
            playingTracks: [],
        },
        missedRolls: {},
        sightRadius: window.SIGHT_RADIUS,
    };
}

function restartGame(state: GameState): void {
    //Object.assign(state,  getInitialState());
    //state.gameHasBeenInitialized = true;
    loadGame(state);
    delete state.dungeon;
    // Delete the current boss, otherwise the current disc
    // will stay active if it has a boss.
    delete state.hero.disc.boss;
    setDerivedHeroStats(state);
    refillAllPotions(state);
    clearNearbyEnemies(state);
    state.sightRadius = window.SIGHT_RADIUS;
    //saveGame(state);
}

function update(): void {
    const state = getState();
    if (!state.gameHasBeenInitialized) {
        initializeGame(state);
        loadGame(state);
        addContextMenuListeners(state);
        setDerivedHeroStats(state);
        refillAllPotions(state);
        clearNearbyEnemies(state);
        // Set testDungeon/testBoss here to load the game in a dungeon and boss room.
        const testDungeon: DungeonType|'' = '';
        if (testDungeon) {
            const dungeon = createDungeon(state, testDungeon, state.hero.level);
            startDungeon(state, dungeon);
            updateActiveCells(state);
            const testBoss = '';
            if (testBoss) {
                const bossDisc = state.activeDiscs.find(d => d.boss?.definition.name === testBoss);
                if (bossDisc) {
                    state.hero.x = bossDisc.x;
                    state.hero.y = bossDisc.y + 200;
                    state.hero.disc = bossDisc;
                }
            }
        }
        assignToDisc(state.hero, state.activeDiscs);
        state.hero.x = state.hero.disc.x;
        state.hero.y = state.hero.disc.y;
        state.paused = true;
    }
    if (!state.audio.playingTracks.length) {
        playTrack;//(state, 'beach');
    }


    // This shouldn't drop below 50% otherwise vision won't change even when you can be 1 shot.
    const healthThreshold = Math.max(0.5, 1 - 0.2 * state.hero.potionEffect);
    // Ranges from 0.5 - 1 as health ranges from 0 to maxLife - 1 potion.
    const sightPercentage = 0.5 + 0.5 * Math.min(1, state.hero.life / state.hero.maxLife / healthThreshold);
    const targetSightRadius = sightPercentage * window.SIGHT_RADIUS;
    if (state.sightRadius < targetSightRadius) {
        state.sightRadius = Math.min(state.sightRadius + 4, targetSightRadius);
    } else if (state.sightRadius > targetSightRadius) {
        state.sightRadius = Math.max(state.sightRadius - 2, targetSightRadius);
    }


    for (const track of state.audio.playingTracks) {
        track.update(state);
    }
    updateKeyboardState(state);
    if (wasGameKeyPressed(state, GAME_KEY.MUTE)) {
        state.areSoundEffectsMuted = !state.areSoundEffectsMuted;
        setVolume(state.areSoundEffectsMuted ? 0 : 1);
    }
    if (state.isUsingXbox) {
        const [dx, dy] = getRightAnalogDeltas(state);
        state.hero.theta = Math.atan2(dy, dx);
        state.hero.isShooting = isGameKeyDown(state, GAME_KEY.SHOOT);
    } else {
        const [x, y] = getMousePosition(mainCanvas, window.CANVAS_SCALE);
        let aimDx = x - window.FIELD_CENTER.x, aimDy = y - window.FIELD_CENTER.y;
        state.hero.theta = Math.atan2(aimDy, aimDx);
        state.mouse.x = x;
        state.mouse.y = y;
        // Track main(left) mouse button state
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
        // Track right mouse button state.
        if (isRightMouseDown()) {
            state.mouse.wasRightPressed = !state.mouse.isRightDown;
            state.mouse.isRightDown = true;
        } else {
            state.mouse.wasRightPressed = false;
            state.mouse.isRightDown = false;
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
        if (isKeyboardKeyDown(KEY.SHIFT)) {
            let [dx, dy] = getMovementDeltas(state);
            const m = Math.sqrt(dx * dx + dy * dy);
            if (m > 1) {
                dx /= m;
                dy /= m;
            }
            const speed = 5000;
            state.hero.x += dx * speed * window.FRAME_LENGTH / 1000;
            state.hero.y += dy * speed * window.FRAME_LENGTH / 1000;
            updateActiveCells(state);
        }
        return;
    }
    state.fieldTime += window.FRAME_LENGTH;
    if (state.hero.life <= 0) {
        restartGame(state);
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
        fieldText.time += window.FRAME_LENGTH;
    }
    const hoverSlot = getHoverInventorySlot(state);
    if (!hoverSlot) {
        state.activeLoot = getClosestElement(state.hero, state.loot);
    } else {
        delete state.activeLoot;
    }
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
    if (hero.damageHistory.length > window.HERO_DAMAGE_FRAME_COUNT) {
        const oldDamage = hero.damageHistory.pop()!;
        hero.recentDamageTaken -= oldDamage;
    }

    // Hero movement
    let [dx, dy] = getMovementDeltas(state);
    const m = Math.sqrt(dx * dx + dy * dy);
    if (m > 1) {
        dx /= m;
        dy /= m;
    }
    const slowEffect = updateSlowEffects(state, state.hero);
    const speed = hero.speed * (1 - slowEffect);
    hero.x += dx * speed * window.FRAME_LENGTH / 1000;
    hero.y += dy * speed * window.FRAME_LENGTH / 1000;
    hero.vx = dx * speed;
    hero.vy = dy * speed;

    // Hero attack
    const weapon = hero.equipment.weapon;
    const attacksPerSecond = weapon.getAttacksPerSecond(state, weapon) * hero.attacksPerSecond * (1 - slowEffect);


    // chargingLevel increases as long as the hero
    // Default charge speed is 1 charge per 20 seconds.
    gainAttackCharge(state, window.FRAME_LENGTH / 20000);


    updateGuardSkill(state);
    if (hero.lastTimeDamaged <= (state.fieldTime - 1000) && hero.armor < hero.baseArmor) {
        hero.armor = Math.min(hero.baseArmor, hero.armor * 1.005);
    }
    const isRolling = !!state.hero.roll;

    if (state.hero.attackChargeLevel > 1) {
        state.hero.attackChargeDuration -= window.FRAME_LENGTH;
        if (state.hero.attackChargeDuration <= 0) {
            state.hero.attackChargeLevel = 1;
        }
    } else if (state.hero.chargingLevel >= 2 && !isRolling &&
        (wasGameKeyPressed(state, GAME_KEY.SPECIAL_ATTACK)
            || (state.isUsingKeyboard && state.mouse.wasRightPressed)
        )
    ) {
        let skipRegularCharge = false;
        for (const enchantment of state.hero.uniqueEnchantments) {
            const definition = uniqueEnchantmentHash[enchantment.uniqueEnchantmentKey];
            skipRegularCharge = skipRegularCharge || !!definition.onActivateCharge?.(state, enchantment);
        }
        // Charge duration is 2 seconds by default.
        if (!skipRegularCharge) {
            state.hero.totalChargeDuration = 2000;
            state.hero.attackChargeDuration = state.hero.totalChargeDuration;
            state.hero.attackChargeLevel = state.hero.chargingLevel;
            playSound(state, 'activateCharge');
            state.hero.chargingLevel = 1;
            // Restart attack pattern when triggering charged attacks.
            hero.attackCooldown = state.fieldTime;
        }
    }

    const isShooting = (
        state.hero.isShooting
        // Automatically shoot when using charge attack.
        || (state.hero.attackChargeLevel > 1 && state.hero.attackChargeDuration > 0)
    ) && !isRolling;
    if (isShooting) {
        const attackCooldownDuration = 1000 / attacksPerSecond;
        if (hero.attackCooldown <= state.fieldTime) {
            hero.attackCooldown = state.fieldTime + attackCooldownDuration;
        }
        const attackTime = attackCooldownDuration - (hero.attackCooldown - state.fieldTime);
        for (const shot of weapon.getShots(state, weapon)) {
            const shotTime = attackCooldownDuration * (shot.timingOffset ?? 0);
            if (shotTime >= attackTime - window.FRAME_LENGTH / 2 && shotTime < attackTime + window.FRAME_LENGTH / 2) {
                // TODO: use right analog stick deltas if playing with game pad instead of state.mouse for target.
                const target = {
                    x: state.hero.x + state.mouse.x - window.FIELD_CENTER.x,
                    y: state.hero.y + state.mouse.y - window.FIELD_CENTER.y,
                }
                const bullet = shot.generateBullet(state, hero, weapon, target);
                if (bullet) {
                    for (const enchantment of hero.uniqueEnchantments) {
                        const definition = uniqueEnchantmentHash[enchantment.uniqueEnchantmentKey];
                        definition.modifyBullet?.(state, enchantment, bullet);
                    }
                    state.heroBullets.push(bullet);
                }
            }
        }
    }

    if (isMiddleMouseDown() && state.dungeon) {
        returnToOverworld(state);
    }

    if (!state.hero.disc?.boss) {
        assignToDisc(state.hero, state.activeDiscs);
    }
    constrainToDisc(state.hero, state.hero.disc);
    constrainFromHoles(state.hero, state.holes);

    for (const portal of state.portals) {
        const isActive = !state.activeLoot && doCirclesIntersect(state.hero, portal);
        if (isActive && wasGameKeyPressed(state, GAME_KEY.ACTIVATE)) {
            portal.activate(state);
            break;
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

    let currentCharge = state.hero.chargingLevel | 0;
    state.hero.chargingLevel = Math.min(getMaxChargeLevel(state), state.hero.chargingLevel + amount);

    if ((state.hero.chargingLevel | 0) > currentCharge) {
        playSound(state, 'chargeReady');
    }
}



function updateEnemies(state: GameState): void {
    const boss = state.hero.disc?.boss;
    for (const enemy of state.enemies) {
        enemy.frameDamageOverTime = 0;
        // Freeze enemies outside of the boss fight.
        if (boss && enemy.disc?.boss !== boss) {
            continue;
        }
        // Freeze bosses that are not activated.
        if (!boss && enemy.disc?.boss === enemy) {
            continue;
        }
        if (enemy.warningTime && enemy.warningTime > 0) {
            enemy.warningTime -= window.FRAME_LENGTH;
            continue;
        }
        enemy.modeTime += window.FRAME_LENGTH;
        enemy.time += window.FRAME_LENGTH;
        enemy.definition.update(state, enemy);
        // No changing discs during boss fights.
        if (!boss) {
            assignToDisc(enemy, state.activeDiscs);
        }
        constrainToDisc(enemy, enemy.disc);
        constrainFromHoles(enemy, state.holes);
    }
}

function updateHeroBullets(state: GameState): void {
    const activeBullets = [];
    for (const bullet of state.heroBullets) {
        if (bullet.time < bullet.duration) {
            activeBullets.push(bullet);
        } else {
            bullet.onDeath?.(state, bullet);
            bullet.onHitOrDeath?.(state, bullet);
        }
    }
    state.heroBullets = [];
    const boss = state.hero.disc?.boss;
    let playedSound = false;
    for (const bullet of activeBullets) {
        bullet.time += window.FRAME_LENGTH;
        if (bullet.warningTime > 0) {
            bullet.warningTime -= window.FRAME_LENGTH;
        }
        bullet.update(state, bullet);
        if (bullet.warningTime > 0) {
            state.heroBullets.push(bullet);
            continue;
        }
        let bulletAbsorbed = false, bulletHit = false;
        for (const enemy of state.enemies) {
            if (enemy.isInvulnerable || (enemy.warningTime && enemy.warningTime > 0)) {
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
                if (bullet.slowEffect) {
                    applySlowEffect(enemy, bullet.slowEffect);
                }
                if (bullet.damageOverTime) {
                    const perFrameDamage = bullet.damageOverTime * window.FRAME_LENGTH / 1000;
                    const maxPerFrameDamage = bullet.damageOverTimeLimit
                        ? bullet.damageOverTimeLimit * window.FRAME_LENGTH / 1000
                        : state.hero.equipment.weapon.damageOverTimeStackSize * perFrameDamage;
                    // Damage over time only applies up to 5x its base damage on enemies.
                    const damageDealt = Math.min(perFrameDamage, maxPerFrameDamage - enemy.frameDamageOverTime)
                    if (damageDealt > 0) {
                        enemy.life -= damageDealt;
                        enemy.frameDamageOverTime += damageDealt;
                        if (enemy.life > 0) {
                            enemy.definition.onDamage?.(state, enemy, bullet);
                        }
                    } else {
                       // console.log(perFrameDamage, 'limited to ', maxPerFrameDamage);
                    }
                } else {
                    bulletHit = true;
                    bullet.hitTargets.add(enemy);
                    const damage = applyArmorToDamage(state, bullet.damage, enemy.armor);
                    if (damage > 0 && !playedSound) {
                        playSound(state, 'dealDamage');
                        playedSound = true;
                        addDamageNumber(state, enemy, damage, bullet.isCrit);
                    }
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
                    if (enemy.life > 0) {
                        // Shots are not absorbed by defeated enemies.
                        bulletAbsorbed = !bullet.isEnemyPiercing;
                        enemy.definition.onHit?.(state, enemy, bullet);
                        enemy.definition.onDamage?.(state, enemy, bullet);
                    }
                }
                if (enemy.life <= 0) {
                    playSound(state, 'defeatEnemy');
                    defeatEnemy(state, enemy);
                }
            }
        }
        if (bulletHit) {
            bullet.onHit?.(state, bullet);
            bullet.onHitOrDeath?.(state, bullet);
        }
        if (!bulletAbsorbed) {
            state.heroBullets.push(bullet);
        } else {
            bullet.onDeath?.(state, bullet);
        }
    }
}

function defeatEnemy(state: GameState, enemy: Enemy): void {
    enemy.life = 0;
    enemy.definition.onDeath?.(state, enemy);
    const experiencePenalty = Math.min(1, Math.max(0, (state.hero.level - enemy.level) * 0.1));
    const experience = getBaseEnemyExperience(enemy.level) * (enemy.definition.experienceFactor ?? 1);
    gainExperience(state, Math.ceil(experience * (1 - experiencePenalty)));
    const {armor, weapon} = state.hero.equipment;
    // Gain more weapon experience when using higher level weapons.
    let weaponXpFactor = 1;
    if (weapon.level > getProficiency(state, weapon.weaponType).level) {
        weaponXpFactor = 2;
    }
    gainEquipmentExperience(state, weapon.weaponType, enemy.level, weaponXpFactor * experience);
    let armorXpFactor = 1;
    if (armor.level > getProficiency(state, armor.armorType).level) {
        armorXpFactor = 2;
    }
    gainEquipmentExperience(state, armor.armorType, enemy.level, armorXpFactor * experience);
    checkToDropBasicLoot(state, enemy);
    if (enemy.disc && enemy.definition.portalDungeonType
        && rollWithMissBonus(state, enemy.definition.portalDungeonType + 'Portal', (enemy.definition.portalChance ?? 0))
    ) {
         addDungeonPortalToDisc(state, enemy, enemy.definition.portalDungeonType, enemy.level, Math.random(), enemy.disc);
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
        const name = enemy.definition.name;
        const weaponType = masteryMap[name];
        const oldMasteryLevel = getMastery(state, weaponType);
        state.hero.bossRecords[name] = Math.max(state.hero.bossRecords[name] || 0, enemy.level);
        setDerivedHeroStats(state);
        const newMasteryLevel = getMastery(state, weaponType);
        if (newMasteryLevel > oldMasteryLevel) {
            state.fieldText.push({
                x: state.hero.x,
                y: state.hero.y - 10,
                vx: 0,
                vy: -0.5,
                text: '+' + (newMasteryLevel - oldMasteryLevel) + ' ' + weaponTypeLabels[weaponType] + ' Mastery!',
                color: 'blue',
                borderColor: 'white',
                expirationTime: state.fieldTime + 3000,
                time: 0,
            });
        }

    }
}

// This radius should be slightly larger than the maximum enemy aggro radius.
// Currently the highest aggro radius is 800 on the sniper.
const enemyBulletR2 = 900 ** 2;
function updateEnemyBullets(state: GameState): void {
    const hero = state.hero;
    hero.frameDamageOverTime = 0;
    let shaved = false, onHit = false;
    const shavebullet = (bullet: Bullet) => {
        if (!state.hero.flags.noShaveCharge) {
            gainAttackCharge(state, 1 / 10);
        }
        for (const enchantment of state.hero.uniqueEnchantments) {
            const definition = uniqueEnchantmentHash[enchantment.uniqueEnchantmentKey];
            definition.onShave?.(state, enchantment, bullet);
        }
        bullet.shaveCompleted = true;
        if (!shaved) {
            playSound(state, 'shaveBullet');
            shaved = true;
        }
    }
    const activeBullets = [];
    for (const bullet of state.enemyBullets) {
        if (bullet.time < bullet.duration) {
            activeBullets.push(bullet);
        } else {
            if (bullet.onDeath) {
                bullet.onDeath(state, bullet);
            }
            if (bullet.shaveStarted && !bullet.shaveCompleted) {
                shavebullet(bullet);
            }
        }
    }

    state.enemyBullets = [];
    const shaveRadius = getHeroShaveRadius(state);
    for (const bullet of activeBullets) {
        const bulletDistance2 = getTargetVector(state.hero, bullet).distance2;
        // Forget about enemy bullets that get too far away.
        if (bulletDistance2 >= enemyBulletR2) {
            continue;
        }
        bullet.time += window.FRAME_LENGTH;
        if (bullet.warningTime > 0) {
            bullet.warningTime -= window.FRAME_LENGTH;
        }
        bullet.update(state, bullet);
        if (bullet.warningTime > 0) {
            state.enemyBullets.push(bullet);
            continue;
        }
        let hitTarget = false;
        if (!hero.roll && !bullet.hitTargets.has(state.hero) && bulletDistance2 < (state.hero.radius + bullet.radius) ** 2) {
            if (bullet.slowEffect) {
                applySlowEffect(state.hero, bullet.slowEffect);
            }
            if (bullet.damageOverTime) {
                damageHeroOverTime(state, bullet.damageOverTime * window.FRAME_LENGTH / 1000);
            } else {
                if (!onHit) {
                    for (const enchantment of state.hero.uniqueEnchantments) {
                        const definition = uniqueEnchantmentHash[enchantment.uniqueEnchantmentKey];
                        definition.onHit?.(state, enchantment, bullet);
                    }
                    onHit = true;
                }
                hitTarget = true;
                let armorShred = bullet.armorShred;
                if (hero.armor <= hero.baseArmor / 2) {
                    armorShred /= 2;
                }
                if (hero.armor <= hero.baseArmor / 4) {
                    armorShred /= 2;
                }
                hero.armor = Math.max(hero.baseArmor / 10, hero.armor * (1 - armorShred));
                hero.lastTimeDamaged = state.fieldTime;
                bullet.hitTargets.add(state.hero);
                damageHero(state, bullet.damage);
            }
        } else if (!bullet.shaveStarted && doCirclesIntersect(bullet, {...state.hero, radius: state.hero.radius + shaveRadius})) {
            bullet.shaveStarted = true;
            /*if (!shaved) {
                playSound(state, 'shaveBullet');
                shaved = true;
            }*/
        } else if (bullet.shaveStarted && !bullet.shaveCompleted && !doCirclesIntersect(bullet, {...state.hero, radius: state.hero.radius + shaveRadius})) {
            shavebullet(bullet);
        }
        if (!hitTarget || bullet.isEnemyPiercing) {
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
function constrainFromHoles(geometry: Geometry, holes: Circle[]) {
    for (const hole of holes) {
        const dx =  geometry.x - hole.x, dy = geometry.y - hole.y;
        const distance2 = dx * dx + dy * dy;
        if (distance2 < hole.radius * hole.radius) {
            const m = Math.sqrt(distance2);
            geometry.x = hole.x + hole.radius * dx / m;
            geometry.y = hole.y + hole.radius * dy / m;
        }
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
setInterval(update, window.FRAME_LENGTH);

