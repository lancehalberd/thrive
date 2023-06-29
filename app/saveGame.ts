import { getProficiency } from 'app/utils/hero';
import { applyUniqueItemEnchantments, generateArmor, generateWeapon } from 'app/utils/item';

interface SaveGameData {
    worldSeed: number
    // Hero data
    level:number
    experience: number
    x: number
    y: number
    weapon: SavedWeapon
    armor: SavedArmor
    proficiency: {[key in ArmorType|WeaponType]: Proficiency}
    weapons: SavedWeapon[]
    armors: SavedArmor[]
    enchantments: Enchantment[]
    bossRecords: {[key in string]: number}
    missedRolls: {[key in string]: number}
}

interface SavedWeapon {
    type: WeaponType
    level: number
    enchantmentSlots: ItemEnchantment[]
    bonusEnchantmentSlots: ItemEnchantment[]
}
interface SavedArmor {
    type: ArmorType
    level: number
    enchantmentSlots: ItemEnchantment[]
    bonusEnchantmentSlots: ItemEnchantment[]
}

function getSaveData(state: GameState): SaveGameData {
    const x = state.dungeon ? state.hero.overworldX : state.hero.x;
    const y = state.dungeon ? state.hero.overworldY : state.hero.y;
    const {armor, weapon} = state.hero.equipment;
    return {
        worldSeed: state.worldSeed,
        // Hero data
        level: state.hero.level,
        experience: state.hero.experience,
        x, y,
        weapon: saveWeapon(weapon),
        armor: saveArmor(armor),
        proficiency: {
            bow: getProficiency(state, 'bow'),
            dagger: getProficiency(state, 'dagger'),
            katana: getProficiency(state, 'katana'),
            morningStar: getProficiency(state, 'morningStar'),
            sword: getProficiency(state, 'sword'),
            wand: getProficiency(state, 'wand'),
            lightArmor: getProficiency(state, 'lightArmor'),
            mediumArmor: getProficiency(state, 'mediumArmor'),
            heavyArmor: getProficiency(state, 'heavyArmor'),
        },
        weapons: state.hero.weapons.map(saveWeapon),
        armors: state.hero.armors.map(saveArmor),
        enchantments: state.hero.enchantments.map(saveEnchantment),
        bossRecords: state.hero.bossRecords,
        missedRolls: state.missedRolls,
    };
}


function saveEnchantment(enchantment: Enchantment): Enchantment {
    return {
        ...enchantment
    }
}


function saveArmor(armor: Armor): SavedArmor {
    return {
        type: armor.armorType,
        level: armor.level,
        enchantmentSlots: armor.enchantmentSlots,
        bonusEnchantmentSlots: armor.bonusEnchantmentSlots,
    };
}
function loadArmor(data: SavedArmor): Armor {
    const armor = generateArmor(data.type, data.level);
    armor.enchantmentSlots = data.enchantmentSlots;
    armor.bonusEnchantmentSlots = data.bonusEnchantmentSlots || [];
    applyUniqueItemEnchantments(armor);
    return armor;
}

function saveWeapon(weapon: Weapon): SavedWeapon {
    return {
        type: weapon.weaponType,
        level: weapon.level,
        enchantmentSlots: weapon.enchantmentSlots,
        bonusEnchantmentSlots: weapon.bonusEnchantmentSlots,
    };
}
function loadWeapon(data: SavedWeapon): Weapon {
    const weapon = generateWeapon(data.type, data.level);
    weapon.enchantmentSlots = data.enchantmentSlots;
    weapon.bonusEnchantmentSlots = data.bonusEnchantmentSlots || [];
    applyUniqueItemEnchantments(weapon);
    return weapon;
}

export function saveGame(state: GameState) {
    try {
        window.localStorage.setItem('savedGame', JSON.stringify(getSaveData(state)));
    } catch (e) {
        console.error(e);
        debugger;
    }
}

export function loadGame(state: GameState) {
    try {
        const jsonData = window.localStorage.getItem('savedGame')
        if (!jsonData) {
            return;
        }
        const data = JSON.parse(jsonData) as SaveGameData;
        if (!data) {
            return;
        }
        state.worldSeed = data.worldSeed;
        state.hero.level = data.level;
        state.hero.experience = data.experience;
        state.hero.overworldX = state.hero.x = data.x;
        state.hero.overworldY = state.hero.y = data.y;
        state.hero.equipment.weapon = loadWeapon(data.weapon);
        state.hero.equipment.armor = loadArmor(data.armor);
        state.hero.weapons = data.weapons.map(loadWeapon);
        state.hero.armors = data.armors.map(loadArmor);
        state.hero.enchantments = data.enchantments;
        // Data below this point might not exist on old save files.
        state.hero.bossRecords = data.bossRecords || {};
        state.missedRolls = data.missedRolls || {};
        state.hero.proficiency = data.proficiency || {};
    } catch (e) {
        console.error(e);
        debugger;
    }
}
