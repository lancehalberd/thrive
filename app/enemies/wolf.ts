import { drawArc, fillCircle } from 'app/render/renderGeometry';
import { updateCirclingBullet } from 'app/utils/bullet';
import { getConnectionPoint } from 'app/utils/disc';
import {
    isEnemyPositionInvalid, moveEnemyInDirection, renderNormalizedEnemy,
    shootCirclingBullet, shootEnemyBullet,
    turnTowardsDirection, turnTowardsTarget,
} from 'app/utils/enemy';
import { doCirclesIntersect, getTargetVector } from 'app/utils/geometry';

export const wolf: EnemyDefinition = {
    name: 'Wolf Man',
    statFactors: {speed: 1.2},
    initialParams: {heading: 0},
    radius: 24,
    update(state: GameState, enemy: Enemy): void {
        if (enemy.mode === 'choose') {
            const {x, y, distance2} = getTargetVector(enemy, state.hero);
            const aggroRadius = 600;
            if (distance2 >= aggroRadius ** 2) {
                return;
            }
            if (enemy.disc === state.hero.disc || doCirclesIntersect(enemy, state.hero.disc)) {
                turnTowardsDirection(state, enemy, Math.atan2(y, x));
                if (distance2 >= 200 * 200) {
                    moveEnemyInDirection(state, enemy);
                } else if (enemy.modeTime >= 500) {
                    if (Math.random() < 0.5) {
                        enemy.setMode('prepareLunge');
                    } else {
                        enemy.setMode('snap');
                    }
                }
            } else if (doCirclesIntersect(enemy.disc, state.hero.disc)) {
                const {x, y} = getConnectionPoint(enemy.disc, state.hero.disc);
                turnTowardsDirection(state, enemy, Math.atan2(y - enemy.y, x - enemy.x));
                moveEnemyInDirection(state, enemy);
            } else {
                moveEnemyInDirection(state, enemy);
                if (isEnemyPositionInvalid(state, enemy)) {
                    const {x, y} = getTargetVector(enemy, enemy.disc);
                    enemy.theta = Math.atan2(y, x) + (0.5 - Math.random()) * Math.PI / 3;
                }
            }
        }
        if (enemy.mode === 'prepareLunge') {
            if (enemy.modeTime < 400) {
                turnTowardsTarget(state, enemy, state.hero);
            }
            moveEnemyInDirection(state, enemy, enemy.theta + Math.PI, enemy.speed / 3);
            if (enemy.modeTime >= 400) {
                enemy.setMode('lunge');
            }
        }
        if (enemy.mode === 'lunge') {
            // Lunge attack with 4 parallel bullets around the wolf
            if (enemy.modeTime <= 600) {
                moveEnemyInDirection(state, enemy, enemy.theta, 2 * enemy.speed);
            }
            if (enemy.modeTime === 200) {
                for (let i = 0; i < 5; i++) {
                    const vForward = {x: Math.cos(enemy.theta), y: Math.sin(enemy.theta)};
                    const vUp = {x: Math.cos(enemy.theta - Math.PI / 2), y: Math.sin(enemy.theta - Math.PI / 2)};
                    const theta = - Math.PI / 2 + i / 4 * Math.PI;
                    const speed = 2 * enemy.speed + 50;
                    const cos = Math.cos(theta);
                    const sin = Math.sin(theta);
                    const x = enemy.x + 60 * vForward.x * cos + 40 * vUp.x * sin;
                    const y = enemy.y + 60 * vForward.y * cos + 40 * vUp.y * sin;
                    shootEnemyBullet(state, enemy, speed * Math.cos(enemy.theta), speed * Math.sin(enemy.theta), {
                        duration: 500,
                        x, baseX: x,
                        y, baseY: y,
                    });
                }
            }
            if (enemy.modeTime >= 1500) {
                enemy.setMode('choose');
            }
        }
        if (enemy.mode === 'snap') {
            // Snapping attack with 6 spinning bullets 3 to a side, snapping together. 400ms tell before they move.
            if (enemy.modeTime === 200 || enemy.modeTime === 600) {
                const numTeeth = 4;
                const maxRange = 160;
                const teethSpacing = maxRange / numTeeth;
                const warningTime = 400;
                const snapTime = 100;
                const snapAngle = Math.PI / 6;
                for (let i = 1; i <= numTeeth; i++) {
                    shootCirclingBullet(state, enemy, enemy.theta - snapAngle, i * teethSpacing, {
                        warningTime: warningTime,
                        duration: warningTime + snapTime,
                        vTheta: 0,
                        update(state: GameState, bullet: Bullet) {
                            updateCirclingBullet(state, bullet);
                            if (bullet.warningTime <= 0) {
                                bullet.vTheta = snapAngle * 1000 / snapTime;
                            }
                        }
                    });
                    shootCirclingBullet(state, enemy, enemy.theta + snapAngle, (i + 0.5) * teethSpacing, {
                        warningTime: warningTime,
                        duration: warningTime + snapTime,
                        vTheta: 0,
                        update(state: GameState, bullet: Bullet) {
                            updateCirclingBullet(state, bullet);
                            if (bullet.warningTime <= 0) {
                                bullet.vTheta = -snapAngle * 1000 / snapTime;
                            }
                        }
                    });
                }
            }
            if (enemy.modeTime >= 1500) {
                enemy.setMode('choose');
            }
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => {
        fillCircle(context, {x: 0, y: 0, radius: 100}, 'black');
        context.fillStyle = enemy.baseColor;
        context.beginPath();
        const mouthCenter = {x: -30, y : 0};
        context.moveTo(mouthCenter.x, mouthCenter.y);
        let frame = ((enemy.time % 400) / 200) | 0;
        if (enemy.mode === 'snap') {
            if (enemy.modeTime <= 600) {
                frame = 3;
            } else if (enemy.modeTime >= 1000) {
                frame = 0;
            } else {
                frame = 2 + (((enemy.modeTime - 600) % 400) / 200) | 0;
            }
        } else if (enemy.mode === 'prepareLunge') {
            frame = 1;
        } else if (enemy.mode === 'lunge') {
            if (enemy.modeTime <= 600) {
                frame = 2;
            } else {
                frame = 0;
            }
        }
        const mouthAngle = [Math.PI / 24, Math.PI / 12, Math.PI / 6, Math.PI / 3][frame];
        drawArc(context, {x: 0, y: 0, radius: 90}, mouthAngle, 2 * Math.PI - mouthAngle);
        context.fill();
        // Teeth
        //context.fillStyle = 'red';
        const bottomPoint = {x: 90 * Math.cos(mouthAngle), y: 90 * Math.sin(mouthAngle)};
        const topPoint = {x: 90 * Math.cos(mouthAngle), y: 90 * Math.sin(-mouthAngle)};
        for (let i = 0; i < 3; i++) {
            const p = (4 - i) / 4 - 0.1;
            context.save();
                context.translate(
                    mouthCenter.x + p * (bottomPoint.x - mouthCenter.x),
                    mouthCenter.y + p * (bottomPoint.y - mouthCenter.y),
                );
                context.rotate(Math.atan2(bottomPoint.y - mouthCenter.y, bottomPoint.x - mouthCenter.x));
                context.beginPath();
                context.moveTo(-8, 0);
                context.lineTo(8, 0);
                context.lineTo(0, -32);
                context.fill();
            context.restore();

            context.save();
                context.translate(
                    mouthCenter.x + p * (topPoint.x - mouthCenter.x),
                    mouthCenter.y + p * (topPoint.y - mouthCenter.y),
                );
                context.rotate(Math.atan2(topPoint.y - mouthCenter.y, topPoint.x - mouthCenter.x));
                context.beginPath();
                context.moveTo(-8, 0);
                context.lineTo(8, 0);
                context.lineTo(0, 32);
                context.fill();
            context.restore();

        }

        // Black eye
        fillCircle(context, {x: -20, y: -50, radius: 15}, 'black');
    }),
};

