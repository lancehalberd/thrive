window.FRAME_LENGTH = 20;

window.CANVAS_WIDTH = 1000;
window.CANVAS_HEIGHT = 800;
window.CANVAS_SCALE = 1;

window.SIGHT_RADIUS = 400;

window.SLOT_SIZE = 40;
window.SLOT_PADDING = 10;


window.CELL_SIZE = 3000;

window.BASE_DROP_CHANCE = 0.15;

window.HERO_DAMAGE_FRAME_COUNT = 20;
    // This is added to the player's base radius.
window.BULLET_SHAVE_RADIUS = 20;
window.BASE_MAX_POTIONS = 5;
window.BASE_XP = 10;
window.BASE_ATTACKS_PER_SECOND = 2;
window.BASE_WEAPON_DPS_PER_LEVEL = 10;
window.BASE_WEAPON_DPS_PER_LEVEL_MULTIPLIER = 1.024;
window.BASE_BULLET_SPEED = 500;
window.BASE_BULLET_RADIUS = 10;
window.BASE_BULLET_DURATION = 1000;

window.BASE_ENEMY_SPEED = 200;
window.BASE_ENEMY_BULLET_SPEED = 250;
window.BASE_ENEMY_BULLET_RADIUS = 10;
window.BASE_ENEMY_BULLET_DURATION = 1000;
window.BOSS_MAX_LIFE_FACTOR = 20;
window.EVENT_BOSS_MAX_LIFE_FACTOR = 30;

window.FIELD_CENTER = {x: window.SIGHT_RADIUS + 40, y: window.CANVAS_HEIGHT / 2};

export const GAME_KEY = {
    MENU: 0,
    UP: 1,
    DOWN: 2,
    LEFT: 3,
    RIGHT: 4,
    RUN: 5,
    ACTIVATE: 6,
    SELL: 7,
    POTION: 8,
    AIM_UP: 9,
    AIM_DOWN: 10,
    AIM_LEFT: 11,
    AIM_RIGHT: 12,
    SHOOT: 13,
    SPECIAL_ATTACK: 14,
    MUTE: 15,
    GUARD_SKILL: 16,
};
