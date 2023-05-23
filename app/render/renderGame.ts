import { CANVAS_HEIGHT, CANVAS_WIDTH, SIGHT_RADIUS } from 'app/constants';
import { createCanvasAndContext } from 'app/utils/canvas';
import { getExperienceForNextLevel } from 'app/utils/hero';


const minimapSize = 500;
const smallMapRect = {x: CANVAS_WIDTH - 155, y: 5, w: 150, h: 150};
const largeMapRect = {x: CANVAS_WIDTH - 405, y: 5, w: 400, h: 400};
const [mapCanvas, mapContext] = createCanvasAndContext(minimapSize, minimapSize);
const mapScale = 20;

export function renderMinimap(discs: Disc[]): void {
    mapContext.fillStyle = '#000';
    mapContext.fillRect(0, 0, minimapSize, minimapSize);
    mapContext.save();
        mapContext.translate(minimapSize / 2, minimapSize / 2);
        mapContext.scale(1 / mapScale, 1 / mapScale);
        mapContext.fillStyle = '#DDD';
        for (const disc of discs) {
            mapContext.beginPath();
            mapContext.arc(disc.x, disc.y, disc.radius, 0, 2 * Math.PI);
            mapContext.fill();
        }
    mapContext.restore();
}

export function render(context: CanvasRenderingContext2D, state: GameState): void {
    context.fillStyle = '#000';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.save();
        context.translate(CANVAS_WIDTH / 2 - state.hero.x, CANVAS_HEIGHT / 2 - state.hero.y);
        state.visibleDiscs.sort((A: Disc, B: Disc) => A.y - B.y);
        for (const disc of state.visibleDiscs) {
            renderDiscEdge1(context, disc);
        }
        for (const disc of state.visibleDiscs) {
            renderDiscEdge2(context, disc);
        }
        for (const disc of state.visibleDiscs) {
            renderDisc(context, disc);
        }
        for (const disc of state.visibleDiscs) {
            renderDiscCenter(context, disc);
        }
        for (const enemy of state.enemies) {
            enemy.definition.render(context, state, enemy);
        }
        for (const enemy of state.enemies) {
            renderEnemyLifebar(context, enemy);
        }
        renderHero(context, state.hero);
        for (const bullet of state.heroBullets) {
            renderHeroBullet(context, bullet);
        }
        for (const bullet of state.enemyBullets) {
            renderEnemyBullet(context, bullet);
        }
    context.restore();
    context.beginPath();
    context.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, SIGHT_RADIUS, 0, 2 * Math.PI, true);
    context.fillStyle = '#000';
    context.fill();

    renderHUD(context, state);
}

function renderHUD(context: CanvasRenderingContext2D, state: GameState): void {
    if (state.paused) {
        context.save();
            context.globalAlpha *= 0.6;
            context.fillStyle = 'black';
            context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        context.restore();

        context.fillStyle = 'white';
        context.textBaseline = 'middle';
        context.textAlign = 'center';
        context.font = '32px sans-serif';
        context.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

    context.fillStyle = 'white';
    context.textBaseline = 'top';
    context.textAlign = 'left';
    context.font = '16px sans-serif';
    context.fillText('Level ' + state.hero.level, 5, 5);

    const lifeRect: Rect = {x: 5, y: 30, h: 20, w: 200};
    renderBar(context, lifeRect, state.hero.life / state.hero.maxLife, 'green', '#888');
    context.fillStyle = 'white';
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = '16px sans-serif';
    context.fillText(state.hero.life + ' / ' + state.hero.maxLife, lifeRect.x + 2, lifeRect.y + lifeRect.h / 2);

    const experienceRect: Rect = {x: 5, y: lifeRect.y + lifeRect.h + 5, h: 10, w: 200};
    const requiredExperience = getExperienceForNextLevel(state.hero.level);
    renderBar(context, experienceRect, state.hero.experience / requiredExperience, 'orange', '#888');


    const minimapRect = state.paused ? largeMapRect : smallMapRect;
    context.fillStyle = 'black';
    context.fillRect(minimapRect.x, minimapRect.y, minimapRect.w, minimapRect.h);
    context.drawImage(mapCanvas,
        minimapSize / 2 + state.hero.x / mapScale - minimapRect.w / 2,
        minimapSize / 2  + state.hero.y / mapScale - minimapRect.h / 2,
        minimapRect.w, minimapRect.h,
        minimapRect.x, minimapRect.y, minimapRect.w, minimapRect.h
    );
    context.fillStyle = 'blue';
    context.fillRect(minimapRect.x + minimapRect.w / 2 - 2, minimapRect.y + minimapRect.h / 2 - 2, 4, 4);
    context.fillStyle = 'red';
    for (const enemy of state.enemies) {
        const x = minimapRect.x + minimapRect.w / 2 + (enemy.x - state.hero.x) / mapScale;
        const y = minimapRect.y + minimapRect.w / 2 + (enemy.y - state.hero.y) / mapScale;
        if (x > minimapRect.x + 2 && x < minimapRect.x + minimapRect.w - 2 &&
            y > minimapRect.y + 2 && y < minimapRect.y + minimapRect.h - 2) {
            context.fillRect(x - 2, y - 2, 4, 4);
        }
    }
}

function renderBar(
    context: CanvasRenderingContext2D,
    {x, y, w, h}: Rect,
    p: number,
    fillColor: string,
    backColor = 'black'
): void {
    context.fillStyle = backColor;
    context.fillRect(x, y, w, h);
    context.fillStyle = fillColor;
    context.fillRect(x, y, w * Math.max(0, Math.min(1,p)), h);
}

function renderEnemyLifebar(context: CanvasRenderingContext2D, enemy: Enemy): void {
    if (enemy.life < enemy.maxLife) {
        let color = '#0F0';
        if (enemy.life <= enemy.maxLife / 4) {
            color = '#F00';
        } else if (enemy.life <= enemy.maxLife / 2) {
            color = '#F80';
        }
        renderBar(context, {x: enemy.x - 15, y: enemy.y - enemy.radius - 8, w: 30, h: 6}, enemy.life / enemy.maxLife, color);
    }
}
function renderEnemyBullet(context: CanvasRenderingContext2D, bullet: Bullet): void {
    fillCircle(context, bullet, 'red');
}
function renderHeroBullet(context: CanvasRenderingContext2D, bullet: Bullet): void {
    fillCircle(context, bullet, 'green');
}
function renderHero(context: CanvasRenderingContext2D, hero: Hero): void {
    fillCircle(context, hero, 'blue');
}

export function fillCircle(context: CanvasRenderingContext2D, circle: Circle, color: string) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
    context.fill();
}

const discDepth = 40;
function renderDiscEdge1(context: CanvasRenderingContext2D, disc: Disc): void {
    context.fillStyle = '#888';
    //context.fillRect(disc.x - disc.radius, disc.y, disc.radius * 2, discDepth);
    context.beginPath();
    //context.moveTo(disc.x - disc.radius, disc.y);
    //context.lineTo(disc.x - disc.radius, disc.y + discDepth);
    context.arc(disc.x, disc.y + discDepth, disc.radius, 0, Math.PI);
    //context.lineTo(disc.x + disc.radius, disc.y);
    context.fill();
}

function renderDiscEdge2(context: CanvasRenderingContext2D, disc: Disc): void {
    context.fillStyle = '#BBB';
    //context.fillRect(disc.x - disc.radius, disc.y, disc.radius * 2, discDepth / 2);
    context.beginPath();
    //context.moveTo(disc.x - disc.radius, disc.y);
    //context.lineTo(disc.x - disc.radius, disc.y + discDepth / 2);
    context.arc(disc.x, disc.y + discDepth / 2, disc.radius, 0, Math.PI);
    //context.lineTo(disc.x + disc.radius, disc.y);
    context.fill();
}

function renderDisc(context: CanvasRenderingContext2D, disc: Disc): void {
    context.fillStyle = '#DDD';
    context.beginPath();
    context.arc(disc.x, disc.y, disc.radius, 0, 2 * Math.PI);
    context.fill();
}


function renderDiscCenter(context: CanvasRenderingContext2D, disc: Disc): void {
    context.fillStyle = '#FFF';
    context.beginPath();
    context.arc(disc.x, disc.y, disc.radius / 2, 0, 2 * Math.PI);
    context.fill();
}
