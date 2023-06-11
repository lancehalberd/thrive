import { armorTypes } from 'app/armor';
import { CANVAS_SCALE, CELL_SIZE } from 'app/constants';
import { createDungeon, dungeonTypes, startDungeon } from 'app/utils/dungeon';
import { generateArmor, generateWeapon } from 'app/loot';
import { KEY, isKeyboardKeyDown } from 'app/utils/userInput';
import { mainCanvas } from 'app/utils/canvas';
import { getElementRect, tagElement } from 'app/utils/dom';
import { getWeaponProficiency, refillAllPotions, setDerivedHeroStats } from 'app/utils/hero';
import { clearNearbyEnemies, updateActiveCells} from 'app/utils/overworld';
import { getMousePosition } from 'app/utils/mouse';
import { weaponTypes } from 'app/weapons';



export class ContextMenu {
    container: HTMLElement;
    domElement?: HTMLElement;
    menuOptions: MenuOption[];
    displayedChildMenu: ContextMenu;
    hoveredOptionElement: HTMLElement;

    constructor(menuOptions: MenuOption[]) {
        this.menuOptions = menuOptions;
    }

    /**
        <div class="contextMenu">
            <div class="contextOption">
                Option 1
            </div>
            <div class="contextOption">
                Option 2
            </div>
        </div>
    */
    render(container: HTMLElement, x: number, y: number): void {
        //this.domElement = createContextMenuElement(this.menuOptions);
        this.container = container;
        this.domElement = tagElement('div', 'contextMenu');
        for (const option of this.menuOptions) {
            const label = option.getLabel ? option.getLabel() : (option.label || ' ');
            const optionElement = tagElement('div', 'contextOption', label);
            if (option.onSelect) {
                optionElement.onclick = function () {
                    option.onSelect?.();
                    hideContextMenu();
                }
            }
            optionElement.addEventListener('mouseover', event => {
                // Do nothing if this is the last element we hovered over.
                if (this.hoveredOptionElement === optionElement) {
                    return;
                }
                if (this.hoveredOptionElement) {
                    this.hoveredOptionElement.classList.remove('open');
                }
                this.hoveredOptionElement = optionElement;
                // If another child menu is being displayed, remove it when we hover
                // over a new element at this level.
                if (this.displayedChildMenu) {
                    this.displayedChildMenu.remove();
                }
                const children = option.getChildren ? option.getChildren() : [];
                if (children.length) {
                    this.hoveredOptionElement.classList.add('open');
                    this.displayedChildMenu = new ContextMenu(children);
                    const limits = getElementRect(mainCanvas, this.container);
                    const r = getElementRect(optionElement, this.container);
                    this.displayedChildMenu.render(this.container, r.x + r.w, r.y);
                    if (!this.displayedChildMenu.domElement) {
                        return;
                    }
                    const r2 = getElementRect(this.displayedChildMenu.domElement, this.container);
                    // If the menu is too low, move it up.
                    const bottom = limits.y + limits.h;
                    if (r2.y + r2.h > bottom) {
                        this.displayedChildMenu.domElement.style.top = `${bottom - r2.h}px`;
                    }
                    // If the menu is too far to the right, display it entirely to the left
                    // of the parent element.
                    if (r2.x + r2.w > limits.x + limits.w) {
                        this.displayedChildMenu.domElement.style.left = `${r.x - r2.w}px`;
                    }
                }
            });
            this.domElement.append(optionElement);
        }

        this.container.append(this.domElement);
        this.domElement.style.left = `${x}px`;
        this.domElement.style.top = `${y}px`;
    }

    remove(): void {
        if (this.domElement) {
            this.domElement.remove();
            delete this.domElement;
            if (this.displayedChildMenu) {
                this.displayedChildMenu.remove();
            }
        }
    }
}

export function getContextMenu(state: GameState): MenuOption[] {
    const options = [
        {
            label: 'Full Life',
            onSelect() {
                refillAllPotions(state);
            }
        },
        {
            label: 'Set Hero Level',
            getChildren() {
                return [5, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(level => ({
                    label: `Lvl ${level}`,
                    onSelect() {
                        state.hero.level = level;
                        state.hero.equipment.weapon = generateWeapon(state.hero.equipment.weapon.weaponType, level)!;
                        state.hero.equipment.armor = generateArmor(state.hero.equipment.armor.armorType, level)!;
                        for (const weaponType of weaponTypes) {
                            const proficiency = getWeaponProficiency(state, weaponType);
                            proficiency.level = level;
                        }
                        // Move hero to corresponding overworld area.
                        if (level === 5) {
                            state.hero.overworldY = -CELL_SIZE * 3;
                        } else {
                            state.hero.overworldY = -CELL_SIZE * (3 + 2 * Math.floor(level / 10));
                        }
                        if (!state.dungeon) {
                            state.hero.y = state.hero.overworldY;
                        }
                        setDerivedHeroStats(state);
                        updateActiveCells(state);
                        clearNearbyEnemies(state);
                    }
                }));
            },
        },
        {
            label: 'Test Dungeon',
            getChildren() {
                return dungeonTypes.map(dungeonType => ({
                    label: dungeonType,
                    onSelect() {
                        const dungeon = createDungeon(dungeonType, state.hero.level);
                        startDungeon(state, dungeon);
                    }
                }));
            },
        },
        {
            label: 'Set Weapon',
            getChildren() {
                return weaponTypes.map(weaponType => ({
                    label: weaponType,
                    onSelect() {
                        state.hero.equipment.weapon = generateWeapon(weaponType, state.hero.level)!;
                        setDerivedHeroStats(state);
                    }
                }));
            },
        },
        {
            label: 'Set Armor',
            getChildren() {
                return armorTypes.map(armorType => ({
                    label: armorType,
                    onSelect() {
                        state.hero.equipment.armor = generateArmor(armorType, state.hero.level)!;
                        setDerivedHeroStats(state);
                    }
                }));
            },
        },

    ];

    return options;
}

const contextMenuState = {
    contextMenu: undefined as ContextMenu|undefined
}

export function showContextMenu(this: void, menu: MenuOption[], x: number, y: number): void {
    hideContextMenu();
    const container = document.body;
    contextMenuState.contextMenu = new ContextMenu(menu);
    contextMenuState.contextMenu.render(container, x, y);
    if (!contextMenuState.contextMenu.domElement) {
        return;
    }
    const limits = getElementRect(mainCanvas, container);
    const r = getElementRect(contextMenuState.contextMenu.domElement, container);
    const bottom = limits.y + limits.h;
    const right = limits.x + limits.w;
    if (r.y + r.h > bottom) {
        contextMenuState.contextMenu.domElement.style.top = `${bottom - r.h}px`;
    }
    // If the menu is too far to the right, display it entirely to the left
    // of the parent element.
    if (r.x + r.w > right) {
        contextMenuState.contextMenu.domElement.style.left = `${right - r.w}px`;
    }
}

export function hideContextMenu(): void {
    if (contextMenuState.contextMenu) {
        contextMenuState.contextMenu.remove();
        delete contextMenuState.contextMenu;
    }
}

export function addContextMenuListeners(state: GameState): void {
    document.addEventListener('mouseup', function (event) {
        if (event.which !== 1) {
            return;
        }
        if (isKeyboardKeyDown(KEY.CONTROL)) {
            event.preventDefault();
            const [x, y] = getMousePosition();
            getMousePosition(mainCanvas, CANVAS_SCALE);
            const menu = getContextMenu(state);
            showContextMenu(menu, x, y);
        } else if (!(event.target as HTMLElement).closest('.contextMenu')) {
            hideContextMenu();
        }
    });
}
