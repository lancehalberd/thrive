import { fillCircle } from 'app/render/renderGeometry';
import { moveEnemyToTargetWithoutTurning, renderNormalizedEnemy, shootBulletInDirection } from 'app/utils/enemy';
import { getTargetVector, turnTowardsAngle } from 'app/utils/geometry';
import Random from 'app/utils/Random';

type HandMode = 'wait'|'spin'|'target'|'swipe';

const handModes: HandMode[] = ['spin', 'spin', 'spin', 'swipe', 'swipe', 'target'];

interface HandParams {
    mode: HandMode
    modeTime: number
    theta: number
    cooldownTime: number
}
interface BanditParams {
    leftHand: HandParams
    rightHand: HandParams
}

function setHandMode(hand: HandParams, mode: HandMode): void {
    hand.mode = mode;
    hand.modeTime = 0;
}

function attackOnCooldown(state: GameState, enemy: Enemy, hand: HandParams, attack: () => void): void {
    if (hand.cooldownTime <= 0) {
        hand.cooldownTime = 1000 / enemy.attacksPerSecond;
        attack();
    }
}

function renderKnife(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy<BanditParams>, x: number, y: number, hand: HandParams) {
    context.save();
        context.translate(x, y);
        context.rotate(hand.theta);
        context.beginPath();
        context.lineWidth = 8;
        context.strokeStyle = context.fillStyle = enemy.baseColor;
        context.moveTo(-60, 0);
        context.lineTo(80, 0);;
        context.moveTo(-20, -40);
        context.lineTo(-20, 40);;
        context.stroke();
        context.beginPath();
        context.moveTo(-20, -20);
        context.lineTo(75, 0);;
        context.lineTo(-20, 20);
        context.fill();

    context.restore();
}

export const bandit: EnemyDefinition<BanditParams> = {
    name: 'Bandit',
    statFactors: {
        attacksPerSecond: 10,
        maxLife: 0.75,
        armor: 0.75,
        damage: 0.75,
        speed: 1.5,
    },
    initialParams: {
        leftHand: {
            mode: 'wait',
            modeTime: 0,
            theta: -Math.PI / 4,
            cooldownTime: 0,
        },
        rightHand: {
            mode: 'wait',
            modeTime: 0,
            theta: -Math.PI / 4,
            cooldownTime: 0,
        },
    },
    radius: 24,
    initialize(state: GameState, enemy: Enemy<BanditParams>): void {
        enemy.params.leftHand = {
            mode: 'wait',
            modeTime: 0,
            theta: -Math.PI / 4,
            cooldownTime: 0,
        };
        enemy.params.rightHand = {
            mode: 'wait',
            modeTime: 0,
            theta: -Math.PI / 4,
            cooldownTime: 0,
        };
    },
    update(state: GameState, enemy: Enemy<BanditParams>): void {
        const chaseRadius = 500;
        const attackRadius = 200;
        const {distance2} = getTargetVector(enemy, state.hero);
        if (distance2 <= attackRadius * attackRadius) {
            if (enemy.mode !== 'attack' && enemy.modeTime >= 200) {
                enemy.setMode('attack');
            }
        } else if (distance2 <= chaseRadius * chaseRadius) {
            if (enemy.mode !== 'chase' && enemy.modeTime >= 200) {
                enemy.setMode('chase');
                enemy.speed = 2 * window.BASE_ENEMY_SPEED;
            }
        } else {
            if (enemy.mode !== 'wait' && enemy.modeTime >= 200) {
                enemy.setMode('wait');
            }
        }
        const {leftHand, rightHand} = enemy.params;
        if (enemy.mode === 'chase' && leftHand.mode === 'wait' && rightHand.mode === 'wait') {
            enemy.speed = Math.max(window.BASE_ENEMY_SPEED, enemy.speed * 0.99);
            moveEnemyToTargetWithoutTurning(state, enemy, state.hero);
        }

        if (enemy.mode === 'attack' && enemy.modeTime % 4000 === 20) {
            setHandMode(enemy.params.leftHand, Random.element(handModes));
        } else if (leftHand.modeTime >= 3000) {
            setHandMode(enemy.params.leftHand, 'wait');
        }
        // Right hand always acts 500ms after left hand.
        if (leftHand.mode !== 'wait' && leftHand.modeTime === 500) {
            setHandMode(enemy.params.rightHand, Random.element(handModes));
        } else if (rightHand.modeTime >= 3000) {
            setHandMode(enemy.params.rightHand, 'wait');
        }
        leftHand.modeTime += window.FRAME_LENGTH;
        rightHand.modeTime += window.FRAME_LENGTH;

        if (leftHand.cooldownTime > 0) {
            leftHand.cooldownTime -= window.FRAME_LENGTH;
        }
        if (rightHand.cooldownTime > 0) {
            rightHand.cooldownTime -= window.FRAME_LENGTH;
        }
        if (leftHand.mode === 'spin') {
            if (leftHand.modeTime <= 500) {
                leftHand.theta -= 2 * Math.PI / 500 * window.FRAME_LENGTH;
            } else if (leftHand.modeTime >= 1000 && leftHand.modeTime <= 3000) {
                leftHand.theta -= 2 * Math.PI / 1000 * window.FRAME_LENGTH;
                attackOnCooldown(state, enemy, leftHand, () => {
                    shootBulletInDirection(state, enemy, leftHand.theta, window.BASE_ENEMY_BULLET_SPEED);
                })
            }
        } else if (leftHand.mode === 'target') {
            const {x, y} = getTargetVector(enemy, {
                x: state.hero.x,
                y: state.hero.y
            });
            leftHand.theta = turnTowardsAngle(leftHand.theta, 0.1, Math.atan2(y, x));
            if (leftHand.modeTime >= 1000 && leftHand.modeTime <= 3000) {
                //const p = (leftHand.modeTime - 1000) % 500 / 500;
                attackOnCooldown(state, enemy, leftHand, () => {
                    shootBulletInDirection(state, enemy, leftHand.theta - Math.PI / 3 * Math.random(), window.BASE_ENEMY_BULLET_SPEED);
                })
            }

        } else if (leftHand.mode === 'swipe') {
            if (leftHand.modeTime <= 500) {
                const {x, y} = getTargetVector(enemy, {
                    x: state.hero.x,
                    y: state.hero.y,
                });
                leftHand.theta = turnTowardsAngle(leftHand.theta, 0.1, Math.atan2(y, x) + Math.PI / 3);
            }
            if (leftHand.modeTime >= 1000 && leftHand.modeTime <= 1400) {
                leftHand.theta -= 2 * Math.PI / 3 / 400 * window.FRAME_LENGTH;
                attackOnCooldown(state, enemy, leftHand, () => {
                    shootBulletInDirection(state, enemy, leftHand.theta, 1.5 * window.BASE_ENEMY_BULLET_SPEED);
                })
            }
            if (leftHand.modeTime >= 2400 && leftHand.modeTime <= 2800) {
                leftHand.theta += 2 * Math.PI / 3 / 400 * window.FRAME_LENGTH;
                attackOnCooldown(state, enemy, leftHand, () => {
                    shootBulletInDirection(state, enemy, leftHand.theta, 1.5 * window.BASE_ENEMY_BULLET_SPEED);
                })
            }
        }


        if (rightHand.mode === 'spin') {
            if (rightHand.modeTime <= 500) {
                rightHand.theta += 2 * Math.PI / 500 * window.FRAME_LENGTH;
            } else if (rightHand.modeTime >= 1000 && rightHand.modeTime <= 3000) {
                rightHand.theta += 2 * Math.PI / 1000 * window.FRAME_LENGTH;
                attackOnCooldown(state, enemy, rightHand, () => {
                    shootBulletInDirection(state, enemy, rightHand.theta, window.BASE_ENEMY_BULLET_SPEED);
                })
            }
        } else if (rightHand.mode === 'target') {
            const {x, y} = getTargetVector(enemy, {
                x: state.hero.x,
                y: state.hero.y
            });
            rightHand.theta = turnTowardsAngle(rightHand.theta, 0.1, Math.atan2(y, x));
            if (rightHand.modeTime >= 1000 && rightHand.modeTime <= 3000) {
                //const p = (rightHand.modeTime - 1000) % 500 / 500;
                attackOnCooldown(state, enemy, rightHand, () => {
                    shootBulletInDirection(state, enemy, rightHand.theta + Math.PI / 3 * Math.random(), window.BASE_ENEMY_BULLET_SPEED);
                })
            }

        } else if (rightHand.mode === 'swipe') {
            if (rightHand.modeTime <= 500) {
                const {x, y} = getTargetVector(enemy, {
                    x: state.hero.x,
                    y: state.hero.y,
                });
                rightHand.theta = turnTowardsAngle(rightHand.theta, 0.1, Math.atan2(y, x) - Math.PI / 3);
            }
            if (rightHand.modeTime >= 1000 && rightHand.modeTime <= 1400) {
                rightHand.theta += 2 * Math.PI / 3 / 400 * window.FRAME_LENGTH;
                attackOnCooldown(state, enemy, rightHand, () => {
                    shootBulletInDirection(state, enemy, rightHand.theta, 1.5 * window.BASE_ENEMY_BULLET_SPEED);
                })
            }
            if (rightHand.modeTime >= 2400 && rightHand.modeTime <= 2800) {
                rightHand.theta -= 2 * Math.PI / 3 / 400 * window.FRAME_LENGTH;
                attackOnCooldown(state, enemy, rightHand, () => {
                    shootBulletInDirection(state, enemy, rightHand.theta, 1.5 * window.BASE_ENEMY_BULLET_SPEED);
                })
            }
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy<BanditParams>) => {
        fillCircle(context, {x: 0, y: 0, radius: 100}, 'black');
        renderKnife(context, state, enemy, -20, -20, enemy.params.leftHand);
        renderKnife(context, state, enemy, 20, 20, enemy.params.rightHand);
    }),
};

