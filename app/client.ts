import { addContextMenuListeners } from 'app/contextMenu';
import { checkToDropBasicLoot, dropEnchantmentLoot } from 'app/loot';
import { getHoverInventorySlot, updateInventory } from 'app/inventory';
import { render } from 'app/render/renderGame';
import { uniqueEnchantmentHash } from 'app/uniqueEnchantmentHash';
import { playSound, playTrack, setVolume } from 'app/utils/audio';
import { mainCanvas, mainContext } from 'app/utils/canvas';
import { addDamageNumber, applyArmorToDamage } from 'app/utils/combat';
import { findClosestDisc } from 'app/utils/disc';
import {
    createDungeon,
    addDungeonPortalToDisc,
    startDungeon,
} from 'app/utils/dungeon';
import { doCirclesIntersect, getClosestElement, getTargetVector } from 'app/utils/geometry';
import {
    damageHero, damageHeroOverTime, gainExperience, gainWeaponExperience, getHeroShaveRadius, getMaxChargeLevel, getWeaponMastery, getWeaponProficiency,
    refillAllPotions, setDerivedHeroStats, weaponMasteryMap,
} from 'app/utils/hero';
import { getMousePosition, isMouseDown, isMiddleMouseDown, isRightMouseDown } from 'app/utils/mouse';
import { addOverworldPortalToDisc, clearNearbyEnemies, returnToOverworld, updateActiveCells } from 'app/utils/overworld';
import { getRightAnalogDeltas, isGameKeyDown, isKeyboardKeyDown, updateKeyboardState, wasGameKeyPressed, KEY } from 'app/utils/userInput';
import Random from 'app/utils/Random';
import { rollWithMissBonus } from 'app/utils/rollWithMissBonus';
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
    SIGHT_RADIUS,
} from 'app/constants';
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
            x: CELL_SIZE / 2,
            y: - CELL_SIZE / 2,
            overworldX: CELL_SIZE / 2,
            overworldY: - CELL_SIZE / 2,
            radius: 20,
            theta: 0,
            damageHistory: [],
            recentDamageTaken: 0,
            equipment: {
                weapon: Random.element(allWeapons.filter(arr => arr.length))[0],
                armor: mediumArmors[0],
            },
            weapons: [],
            weaponProficiency: {},
            weaponMastery: {},
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
            potions: BASE_MAX_POTIONS,
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
            x: CANVAS_WIDTH / 2,
            y: CANVAS_HEIGHT / 2,
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
        sightRadius: SIGHT_RADIUS,
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
    state.sightRadius = SIGHT_RADIUS;
    //saveGame(state);
}

function update(): void {
    const state = getState();
    if (!state.gameHasBeenInitialized) {
        initializeGame(state);
        loadGame(state);
        addContextMenuListeners(state);
        setDerivedHeroStats(state);
        clearNearbyEnemies(state);
        // Set testDungeon/testBoss here to load the game in a dungeon and boss room.
        const testDungeon: DungeonType|'' = '';
        if (testDungeon) {
            const dungeon = createDungeon(testDungeon, state.hero.level);
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
        state.paused = true;
    }
    if (!state.audio.playingTracks.length) {
        playTrack;//(state, 'beach');
    }


    // This shouldn't drop below 50% otherwise vision won't change even when you can be 1 shot.
    const healthThreshold = Math.max(0.5, 1 - 0.2 * state.hero.potionEffect);
    // Ranges from 0.5 - 1 as health ranges from 0 to maxLife - 1 potion.
    const sightPercentage = 0.5 + 0.5 * Math.min(1, state.hero.life / state.hero.maxLife / healthThreshold);
    const targetSightRadius = sightPercentage * SIGHT_RADIUS;
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
        const [x, y] = getMousePosition(mainCanvas, CANVAS_SCALE);
        let aimDx = x - FIELD_CENTER.x, aimDy = y - FIELD_CENTER.y;
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
        return;
    }
    state.fieldTime += FRAME_LENGTH;
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
        fieldText.time += FRAME_LENGTH;
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
    hero.x += dx * speed * FRAME_LENGTH / 1000;
    hero.y += dy * speed * FRAME_LENGTH / 1000;
    hero.vx = dx * speed;
    hero.vy = dy * speed;

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
    if (state.hero.isShooting) {
        const attackCooldownDuration = 1000 / attacksPerSecond;
        if (hero.attackCooldown <= state.fieldTime) {
            hero.attackCooldown = state.fieldTime + attackCooldownDuration;
        }
        const attackTime = attackCooldownDuration - (hero.attackCooldown - state.fieldTime);
        for (const shot of weapon.shots) {
            const shotTime = attackCooldownDuration * (shot.timingOffset ?? 0);
            if (shotTime >= attackTime - FRAME_LENGTH / 2 && shotTime < attackTime + FRAME_LENGTH / 2) {
                const bullet = shot.generateBullet(state, hero, weapon);
                for (const enchantment of hero.uniqueEnchantments) {
                    const definition = uniqueEnchantmentHash[enchantment.uniqueEnchantmentKey];
                    definition.modifyBullet?.(state, enchantment, bullet);
                }
                state.heroBullets.push(bullet);
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
        // Freeze enemies outside of the boss fight.
        if (boss && enemy.disc?.boss !== boss) {
            continue;
        }
        // Freeze bosses that are not activated.
        if (!boss && enemy.disc?.boss === enemy) {
            continue;
        }
        enemy.modeTime += FRAME_LENGTH;
        enemy.time += FRAME_LENGTH;
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
        bullet.time += FRAME_LENGTH;
        if (bullet.warningTime > 0) {
            bullet.warningTime -= FRAME_LENGTH;
        }
        bullet.update(state, bullet);
        if (bullet.warningTime > 0) {
            state.heroBullets.push(bullet);
            continue;
        }
        let bulletAbsorbed = false, bulletHit = false;
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
                if (bullet.damageOverTime) {
                    enemy.life -= bullet.damageOverTime * FRAME_LENGTH / 1000;
                } else {
                    bulletHit = true;
                    bullet.hitTargets.add(enemy);
                    if (!playedSound) {
                        playSound(state, 'dealDamage');
                        playedSound = true;
                    }
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
                    if (enemy.life > 0) {
                        // Shots are not absorbed by defeated enemies.
                        bulletAbsorbed = !bullet.isEnemyPiercing;
                        enemy.definition.onHit?.(state, enemy, bullet);
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
    const experience = BASE_XP * Math.pow(1.2, enemy.level - 1) * (enemy.definition.experienceFactor ?? 1);
    gainExperience(state, Math.ceil(experience * (1 - experiencePenalty)));
    const weapon = state.hero.equipment.weapon;
    // Gain more weapon experience when using higher level weapons.
    let weaponXpFactor = 1;
    if (weapon.level > getWeaponProficiency(state, weapon.weaponType).level) {
        weaponXpFactor = 2;
    }
    gainWeaponExperience(state, state.hero.equipment.weapon.weaponType, enemy.level, weaponXpFactor * experience);
    checkToDropBasicLoot(state, enemy);
    if (enemy.disc && enemy.definition.portalDungeonType
        && rollWithMissBonus(state, enemy.definition.portalDungeonType + 'Portal', (enemy.definition.portalChance ?? 0))
    ) {
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
        const name = enemy.definition.name;
        const weaponType = weaponMasteryMap[name];
        const oldMasteryLevel = getWeaponMastery(state, weaponType);
        state.hero.bossRecords[name] = Math.max(state.hero.bossRecords[name] || 0, enemy.level);
        setDerivedHeroStats(state);
        const newMasteryLevel = getWeaponMastery(state, weaponType);
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

function updateEnemyBullets(state: GameState): void {
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
        bullet.time += FRAME_LENGTH;
        if (bullet.warningTime > 0) {
            bullet.warningTime -= FRAME_LENGTH;
        }
        bullet.update(state, bullet);
        if (bullet.warningTime > 0) {
            state.enemyBullets.push(bullet);
            continue;
        }
        let hitTarget = false;
        if (doCirclesIntersect(state.hero, bullet)) {
            if (bullet.damageOverTime) {
                damageHeroOverTime(state, bullet.damageOverTime * FRAME_LENGTH / 1000);
            } else {
                if (!onHit) {
                    for (const enchantment of state.hero.uniqueEnchantments) {
                        const definition = uniqueEnchantmentHash[enchantment.uniqueEnchantmentKey];
                        definition.onHit?.(state, enchantment, bullet);
                    }
                    onHit = true;
                }
                hitTarget = true;
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
setInterval(update, FRAME_LENGTH);

