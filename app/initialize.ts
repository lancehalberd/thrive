import { query } from 'app/utils/dom';
import { addKeyboardListeners } from 'app/utils/userInput';
import { addContextMenuListeners, bindMouseListeners } from 'app/utils/mouse';

export function initializeGame(state: GameState) {
    bindMouseListeners();
    addContextMenuListeners();
    addKeyboardListeners();
    query('.js-loading')!.style.display = 'none';
    query('.js-gameContent')!.style.display = '';
    state.gameHasBeenInitialized = true;
}
