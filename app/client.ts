import { chaser } from 'app/enemies/chaser';
import { circler } from 'app/enemies/circler';
import { lord } from 'app/enemies/lord';
import { turret } from 'app/enemies/turret';
import { render, renderMinimap } from 'app/render/renderGame';
import { mainCanvas, mainContext } from 'app/utils/canvas';
import { createTreeDungeon, startDungeon } from 'app/utils/dungeon';
import { createEnemy } from 'app/utils/enemy';
import { findClosestDisc } from 'app/utils/geometry';
import { gainExperience } from 'app/utils/hero';
import { getMousePosition, isMouseDown, isRightMouseDown } from 'app/utils/mouse';
import { isGameKeyDown, updateKeyboardState, wasGameKeyPressed } from 'app/utils/userInput';
import Random from 'app/utils/Random';
import { BASE_XP, CANVAS_HEIGHT, CANVAS_SCALE, CANVAS_WIDTH,FRAME_LENGTH, GAME_KEY } from 'app/constants';
import { initializeGame } from 'app/initialize';

const testDiscs: Disc[] = [
    {x: 500, y: 500, radius: 500, links: []},
    {x: 1200, y: 1200, radius: 800, links: []},
    {x: 500, y: -200, radius: 500, links: []},
]

let state: GameState = {
    fieldTime: 0,
    hero: {
        level: 0,
        experience: 0,
        life: 20,
        maxLife: 20,
        speed: 100,
        armor: 1,
        damage: 20,
        attacksPerSecond: 2,
        attackCooldown: 0,
        x: 500,
        y: 500,
        radius: 15,
        theta: 0,
    },
    heroBullets: [],
    enemies: [],
    enemyBullets: [],
    activeDiscs: testDiscs,
    visibleDiscs: testDiscs,
    gameHasBeenInitialized: false,
    paused: false,
    keyboard: {
        gameKeyValues: [],
        gameKeysDown: new Set(),
        gameKeysPressed: new Set(),
        mostRecentKeysPressed: new Set(),
        gameKeysReleased: new Set(),
    },
};
// @ts-ignore
window['state'] = state;
function getState(): GameState {
    return state;
}

function doCirclesIntersect(circleA: Circle, circleB: Circle): boolean {
    const radius = circleA.radius + circleB.radius;
    const dx = circleB.x - circleA.x, dy = circleB.y - circleA.y;
    return dx * dx + dy * dy < radius * radius;
}

function update(): void {
    const state = getState();
    if (!state.gameHasBeenInitialized) {
        initializeGame(state);
        startDungeon(state, createTreeDungeon(Math.random(), 4000, 0));
        renderMinimap(state.activeDiscs);
    }
    updateKeyboardState(state);
    if (wasGameKeyPressed(state, GAME_KEY.MENU)) {
        state.paused = !state.paused;
    }
    if (state.paused) {
        return;
    }
    state.fieldTime += FRAME_LENGTH;
    if (state.hero.life <= 0) {
        return;
    }
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
    updateEnemies(state);
    updateHeroBullets(state);
    updateEnemyBullets(state);
    const speed = isRightMouseDown() ? state.hero.speed : 1.5 * state.hero.speed;
    state.hero.x += dx * speed / FRAME_LENGTH;
    state.hero.y += dy * speed / FRAME_LENGTH;
    assignToDisc(state.hero, state.activeDiscs);
    constrainToDisc(state.hero, state.hero.disc);

    if (isMouseDown() && state.hero.attackCooldown <= state.fieldTime) {
        state.hero.attackCooldown = state.fieldTime + 1000 / state.hero.attacksPerSecond;
        const [x, y] = getMousePosition(mainCanvas, CANVAS_SCALE);
        let dx = x - CANVAS_WIDTH / 2, dy = y - CANVAS_HEIGHT / 2;
        const m = Math.sqrt(dx * dx + dy * dy);
        if (m > 1) {
            dx /= m;
            dy /= m;
        }
        state.heroBullets.push({
            x: state.hero.x + dx * state.hero.radius,
            y: state.hero.y + dy * state.hero.radius,
            damage: state.hero.damage,
            radius: 5,
            vx: dx * 200,
            vy: dy * 200,
            expirationTime: state.fieldTime + 1000,
        });
    }

    if (state.enemies.filter(e => !e.master).length < 0) {
        for (const disc of state.activeDiscs) {
            if (disc === state.hero.disc) {
                continue;
            }
            if (Math.random() < 0.05) {
                const definition: EnemyDefinition = Random.element([turret, chaser, chaser, circler, circler, lord]);
                const radius = definition === turret ? disc.radius / 8 : disc.radius / 4;
                const theta = Math.random() * 2 * Math.PI;
                let level = Math.floor(state.hero.level / 2);
                while (Math.random() < 0.5 && level < state.hero.level) {
                    level++;
                }
                const enemy = createEnemy(
                    disc.x + radius * Math.cos(theta),
                    disc.y + radius * Math.sin(theta),
                    definition,
                    level
                );
                state.enemies.push(enemy);
            }
        }
    }
}

function updateEnemies(state: GameState): void {
    for (const enemy of state.enemies) {
        enemy.definition.update(state, enemy);
        assignToDisc(enemy, state.activeDiscs);
        constrainToDisc(enemy, enemy.disc);
    }
}

function updateHeroBullets(state: GameState): void {
    const activeBullets = state.heroBullets.filter(b => b.expirationTime >= state.fieldTime);
    state.heroBullets = [];
    for (const bullet of activeBullets) {
        bullet.x += bullet.vx / FRAME_LENGTH;
        bullet.y += bullet.vy / FRAME_LENGTH;
        let bulletAbsorbed = false;
        for (const enemy of state.enemies) {
            if (doCirclesIntersect(enemy, bullet)) {
                enemy.life -= bullet.damage;
                if (enemy.life <= 0) {
                    gainExperience(state,
                        Math.ceil(BASE_XP * Math.pow(1.2, enemy.level) * (enemy.definition.experienceFactor ?? 1))
                    );
                } else {
                    // Shots are not absorbed by defeated enemies.
                    bulletAbsorbed = true;
                }
            }
        }
        if (!bulletAbsorbed) {
            state.heroBullets.push(bullet);
        }
    }
    state.enemies = state.enemies.filter(e => e.life > 0);
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
            state.hero.life -= bullet.damage;
            if (state.hero.life <= 0) {
                state.hero.life = 0;
                // game over.
            }
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
        render(mainContext, getState());
    } catch (e) {
        console.log(e);
        debugger;
    }
}
renderLoop();
setInterval(update, FRAME_LENGTH);

