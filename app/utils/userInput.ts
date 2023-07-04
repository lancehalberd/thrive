/* global navigator */
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
    [GAME_KEY.MUTE]: [KEY.M],
    [GAME_KEY.GUARD_SKILL]: [KEY.SHIFT, KEY.C, KEY.V, KEY.B],
}

// Under this threshold, the analog buttons are considered "released" for the sake of
// actions that are only taken once per button push (like moving a menu cursor).
export const ANALOG_THRESHOLD = 0.3;

// This mapping assumes a canonical gamepad setup as seen in:
// https://w3c.github.io/gamepad/#remapping
// Which seems to work well with my xbox 360 controller.
// I based this code on examples from:
// https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
// Easy to find mappings at: http://html5gamepad.com/
const GAME_PAD_MAPPINGS = {
    [GAME_KEY.MENU]: 9, // START
    [GAME_KEY.UP]: 12,
    [GAME_KEY.DOWN]: 13,
    [GAME_KEY.LEFT]: 14,
    [GAME_KEY.RIGHT]: 15,
    [GAME_KEY.ACTIVATE]: [
        0, // A (bottom button)
        1, // B (right button)
    ],
    [GAME_KEY.SELL]: 3, // Y (top button)
    [GAME_KEY.POTION]: 4, // L1 (left shoulder button)
    [GAME_KEY.SHOOT]: 5, // R1 (right shoulder button)
    [GAME_KEY.SPECIAL_ATTACK]: 6, // L Back Bumper
    // 2, // X (left button)
    // 7, // R Back bumper
    // 8, // BACK
    // 10 ??
    // 11 ??
};

const LEFT_ANALOG_Y_AXIS = 1;
const LEFT_ANALOG_X_AXIS = 0;
const RIGHT_ANALOG_Y_AXIS = 3;
const RIGHT_ANALOG_X_AXIS = 2;
// These two are currently unused, but would be used for aiming instead of the mouse.
//const RIGHT_ANALOG_Y_AXIS = 3; // eslint-disable-line no-unused-vars
//const RIGHT_ANALOG_X_AXIS = 2; // eslint-disable-line no-unused-vars
const GAME_PAD_AXIS_MAPPINGS = {
    // Map the negative y axis of the left stick to the up key.
    [GAME_KEY.UP]: [LEFT_ANALOG_Y_AXIS, -1],
    // Map the positive y axis of the left stick to the down key.
    [GAME_KEY.DOWN]: [LEFT_ANALOG_Y_AXIS, 1],
    // Map the negative x axis of the left stick to the up key.
    [GAME_KEY.LEFT]: [LEFT_ANALOG_X_AXIS, -1],
    // Map the positive x axis of the left stick to the down key.
    [GAME_KEY.RIGHT]: [LEFT_ANALOG_X_AXIS, 1],
    // Map the negative y axis of the right stick to the aim up key.
    [GAME_KEY.AIM_UP]: [RIGHT_ANALOG_Y_AXIS, -1],
    // Map the positive y axis of the right stick to the aim down key.
    [GAME_KEY.AIM_DOWN]: [RIGHT_ANALOG_Y_AXIS, 1],
    // Map the negative x axis of the right stick to the aim up key.
    [GAME_KEY.AIM_LEFT]: [RIGHT_ANALOG_X_AXIS, -1],
    // Map the positive x axis of the right stick to the aim down key.
    [GAME_KEY.AIM_RIGHT]: [RIGHT_ANALOG_X_AXIS, 1],
};

// Apparently, depending on the button type, either button.pressed or button == 1.0 indicates the button is pressed.
function buttonIsPressed(button: {pressed: boolean}|number): boolean {
  if (typeof(button) == "object") return button.pressed;
  return button == 1.0;
}

const keysDown: number[] = [];
let lastInput: 'keyboard' | 'gamepad' | undefined;
export function isKeyboardKeyDown(keyCode: number) {
    if (keysDown[keyCode]) {
        lastInput = 'keyboard';
        return 1;
    }
    return 0;
}
function isGamepadGamekeyPressed(gameKey: number) {
    // If a mapping exists for the current key code to a gamepad button,
    // check if that gamepad button is pressed.
    const buttonIndexArrayOrNumber = GAME_PAD_MAPPINGS[gameKey], axisIndex = GAME_PAD_AXIS_MAPPINGS[gameKey];
    const buttonIndexArray = Array.isArray(buttonIndexArrayOrNumber) ? buttonIndexArrayOrNumber : [buttonIndexArrayOrNumber];
    for (const buttonIndex of buttonIndexArray) {
        if (typeof(buttonIndex) !== 'undefined' || typeof(axisIndex) !== 'undefined') {
            // There can be multiple game pads connected. For now, let's just check all of them for the button.
            const gamepads = navigator.getGamepads();
            for (const gamepad of gamepads) {
                if (!gamepad) continue;
                let value = 0;
                if (typeof(buttonIndex) !== 'undefined' && buttonIsPressed(gamepad.buttons[buttonIndex])) {
                    value = 1;
                } else if (typeof(axisIndex) !== 'undefined' && gamepad.axes[axisIndex[0]] * axisIndex[1] > 0) {
                    value = gamepad.axes[axisIndex[0]] * axisIndex[1];
                }
                if (value) {
                    if (value >= ANALOG_THRESHOLD) {
                        lastInput = 'gamepad';
                    }
                    return value;
                }
            }
        }
    }
    return 0;
}

export function addKeyboardListeners() {
    addEventListener('blur', (event: FocusEvent) => {
        for (let i = 0; i < keysDown.length; i++) {
            keysDown[i] = 0;
        }
    });
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
        if (!gameKeyValues[gameKey]) {
            gameKeyValues[gameKey] = isGamepadGamekeyPressed(gameKey);
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
    if (lastInput === 'gamepad') {
        state.isUsingKeyboard = false;
        state.isUsingXbox = true;
    } else if (lastInput === 'keyboard') {
        state.isUsingKeyboard = true;
        state.isUsingXbox = false;
    }
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

export function getMovementDeltas(state: GameState): [number, number] {
    const { gameKeyValues } = state.keyboard;
    let dy = gameKeyValues[GAME_KEY.DOWN] - gameKeyValues[GAME_KEY.UP];
    if (Math.abs(dy) < ANALOG_THRESHOLD) dy = 0;
    let dx = gameKeyValues[GAME_KEY.RIGHT] - gameKeyValues[GAME_KEY.LEFT];
    if (Math.abs(dx) < ANALOG_THRESHOLD) dx = 0;
    if (isNaN(dx) || isNaN(dy)) {
        debugger;
    }
    return [dx, dy];
}

export function getRightAnalogDeltas(state: GameState): [number, number] {
    const { gameKeyValues } = state.keyboard;
    let dy = gameKeyValues[GAME_KEY.AIM_DOWN] - gameKeyValues[GAME_KEY.AIM_UP];
    let dx = gameKeyValues[GAME_KEY.AIM_RIGHT] - gameKeyValues[GAME_KEY.AIM_LEFT];
    if (Math.abs(dx) < ANALOG_THRESHOLD && Math.abs(dy) < ANALOG_THRESHOLD) {
        return [0, 0];
    }
    if (isNaN(dx) || isNaN(dy)) {
        debugger;
    }
    return [dx, dy];
}
