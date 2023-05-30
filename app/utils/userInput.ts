import { GAME_KEY } from 'app/constants';

export const KEY = {
    ESCAPE: 27,
    LEFT: 37,
    RIGHT: 39,
    UP: 38,
    DOWN: 40,
    SPACE: 32,
    SHIFT: 16,
    ENTER: 13,
    BACK_SPACE: 8,
    COMMAND: 91,
    CONTROL: 17,
    LEFT_BRACKET: 219,
    BACK_SLASH: 220,
    RIGHT_BRACKET: 221,
    A: 'A'.charCodeAt(0),
    B: 'B'.charCodeAt(0),
    C: 'C'.charCodeAt(0),
    D: 'D'.charCodeAt(0),
    E: 'E'.charCodeAt(0),
    F: 'F'.charCodeAt(0),
    G: 'G'.charCodeAt(0),
    H: 'H'.charCodeAt(0),
    I: 'I'.charCodeAt(0),
    J: 'J'.charCodeAt(0),
    K: 'K'.charCodeAt(0),
    L: 'L'.charCodeAt(0),
    M: 'M'.charCodeAt(0),
    O: 'O'.charCodeAt(0),
    P: 'P'.charCodeAt(0),
    Q: 'Q'.charCodeAt(0),
    R: 'R'.charCodeAt(0),
    S: 'S'.charCodeAt(0),
    T: 'T'.charCodeAt(0),
    U: 'U'.charCodeAt(0),
    V: 'V'.charCodeAt(0),
    W: 'W'.charCodeAt(0),
    X: 'X'.charCodeAt(0),
    Y: 'Y'.charCodeAt(0),
    Z: 'Z'.charCodeAt(0),
};

const KEYBOARD_MAPPINGS = {
    [GAME_KEY.MENU]: [KEY.ENTER], // START
    [GAME_KEY.UP]: [KEY.UP, KEY.W],
    [GAME_KEY.DOWN]: [KEY.DOWN, KEY.S],
    [GAME_KEY.LEFT]: [KEY.LEFT, KEY.A],
    [GAME_KEY.RIGHT]: [KEY.RIGHT, KEY.D],
    [GAME_KEY.ACTIVATE]: [KEY.F],
    [GAME_KEY.SELL]: [KEY.X],
    [GAME_KEY.POTION]: [KEY.SPACE],
}

const ANALOG_THRESHOLD = 0.3;

const keysDown: number[] = [];
export function isKeyboardKeyDown(keyCode: number) {
    if (keysDown[keyCode]) {
        return 1;
    }
    return 0;
}

export function addKeyboardListeners() {
    document.addEventListener('keyup', function(event) {
        const keyCode: number = event.which;
        keysDown[keyCode] = 0;
    });
    document.addEventListener('keydown', function(event: KeyboardEvent) {
        if (event.repeat) {
            return;
        }
        // Don't process keys if an input is targeted, otherwise we prevent typing in
        // the input.
        if ((event.target as HTMLElement).closest('input')
            || (event.target as HTMLElement).closest('textarea')
            || (event.target as HTMLElement).closest('select')
        ) {
            return;
        }
        const commandIsDown = (keysDown[KEY.CONTROL] || keysDown[KEY.COMMAND]);
        const keyCode: number = event.which;
        //console.log(keyCode);
        // Don't override the refresh page command.
        if (keyCode === KEY.R && commandIsDown) {
            return;
        }
        keysDown[keyCode] = 1;
    });
}

export function updateKeyboardState(state: GameState) {
    const previousGameKeysDown = state.keyboard.gameKeysDown;
    // This set is persisted until a new set of keys is pressed.
    let mostRecentKeysPressed: Set<number> = state.keyboard.mostRecentKeysPressed;
    const gameKeyValues: number[] = [];
    const gameKeysDown: Set<number> = new Set();
    const gameKeysPressed: Set<number> = new Set();
    const gameKeysReleased: Set<number> = new Set();
    /*for (const gameKey of GAME_PAD_AXIS_MAPPINGS) {

    }*/
    for (let gameKey of Object.values(GAME_KEY)) {
        gameKeyValues[gameKey] = 0;
        for (const keyboardCode of (KEYBOARD_MAPPINGS[gameKey] || [])) {
            gameKeyValues[gameKey] = isKeyboardKeyDown(keyboardCode);
            if (gameKeyValues[gameKey]) {
                break;
            }
        }
        if (gameKeyValues[gameKey] >= ANALOG_THRESHOLD) {
            gameKeysDown.add(gameKey);
        }
    }
    for (const oldKeyDown of [...previousGameKeysDown]) {
        if (!gameKeysDown.has(oldKeyDown)) {
            gameKeysReleased.add(oldKeyDown);
        }
    }
    for (const newKeyDown of [...gameKeysDown]) {
        if (!previousGameKeysDown.has(newKeyDown)) {
            gameKeysPressed.add(newKeyDown);
        }
    }
    if (gameKeysPressed.size > 0) {
        mostRecentKeysPressed = gameKeysPressed;
    }
    state.keyboard = { gameKeyValues, gameKeysDown, gameKeysPressed, gameKeysReleased, mostRecentKeysPressed };
}


export function clearKeyboardState(state: GameState) {
    const gameKeyValues = [];
    for (let gameKey of Object.values(GAME_KEY)) {
        gameKeyValues[gameKey] = 0;
    }
    state.keyboard = {
        gameKeyValues,
        gameKeysDown: new Set(),
        gameKeysPressed: new Set(),
        gameKeysReleased: new Set(),
        mostRecentKeysPressed: new Set(),
    };
}

export function wasGameKeyPressed(state: GameState, keyCode: number): boolean {
    return state.keyboard.gameKeysPressed.has(keyCode);
}

// Only returns true if a key was pressed and released without any other keys having been pressed in between.
// Specifically this is used to determined whether to switch clones, which should only happen if the user presses
// the clone tool button without pressing any other buttons before releasing it. Note that it is okay if they
// continue holding buttons that were already down when pressing the clone button.
export function wasGameKeyPressedAndReleased(state: GameState, keyCode: number): boolean {
    return state.keyboard.mostRecentKeysPressed.has(keyCode) && state.keyboard.gameKeysReleased.has(keyCode);
}

export function isGameKeyDown(state: GameState, keyCode: number): boolean {
    return state.keyboard.gameKeysDown.has(keyCode);
}

