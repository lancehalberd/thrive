interface Window {
    FRAME_LENGTH: number;

    CANVAS_WIDTH: number;
    CANVAS_HEIGHT: number;
    CANVAS_SCALE: number;

    SIGHT_RADIUS: number;

    SLOT_SIZE: number;
    SLOT_PADDING: number;


    CELL_SIZE: number;

    BASE_DROP_CHANCE: number;

    HERO_DAMAGE_FRAME_COUNT: number;
    // This is added to the player's base radius.
    BULLET_SHAVE_RADIUS: number;
    BASE_MAX_POTIONS: number;
    BASE_XP: number;
    BASE_ATTACKS_PER_SECOND: number;
    BASE_WEAPON_DPS_PER_LEVEL: number;
    BASE_WEAPON_DPS_PER_LEVEL_MULTIPLIER: number;
    BASE_BULLET_SPEED: number;
    BASE_BULLET_RADIUS: number;
    BASE_BULLET_DURATION: number;

    BASE_ENEMY_SPEED: number;
    BASE_ENEMY_BULLET_SPEED: number;
    BASE_ENEMY_BULLET_RADIUS: number;
    BASE_ENEMY_BULLET_DURATION: number;
    BOSS_MAX_LIFE_FACTOR: number;
    EVENT_BOSS_MAX_LIFE_FACTOR: number;

    FIELD_CENTER: Point
}
