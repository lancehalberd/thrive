import { fillCircle } from 'app/render/renderGeometry';
import { findClosestDiscToDisc } from 'app/utils/disc';
import {
    moveEnemyInDirection, moveEnemyToTargetWithoutTurning, renderNormalizedEnemy, shootBulletArc, shootBulletAtHeroHeading, shootBulletCircle,
} from 'app/utils/enemy';
import { doCirclesIntersect, getTargetVector } from 'app/utils/geometry';


interface SwampDragonParams {
    nextDisc?: Disc
}
export const swampDragon: EnemyDefinition<SwampDragonParams> = {
    name: 'Swamp Dragon',
    statFactors: {
        maxLife: 2,
        armor: 1.5,
        speed: 1.5,
    },
    dropChance: 2 * window.BASE_DROP_CHANCE,
    uniqueMultiplier: 2,
    experienceFactor: 2,
    initialParams: {},
    radius: 36,
    update(state: GameState, enemy: Enemy<SwampDragonParams>): void {
        if (enemy.mode === 'choose') {
            if (enemy.disc !== state.hero.disc) {
                // There is a bug where sometimes adjacent discs are not connected,
                // so we manually check if this disc is touching the hero's disc as a workaround.
                if (doCirclesIntersect(enemy.disc, state.hero.disc)) {
                    enemy.params.nextDisc = state.hero.disc;
                } else {
                    enemy.params.nextDisc = findClosestDiscToDisc(state.hero.disc, enemy.disc.links);
                }
                enemy.setMode('chase');
                return;
            }
            const {distance2} = getTargetVector(enemy.disc, state.hero);
            if (distance2 <= (enemy.disc.radius / 2) ** 2) {
                enemy.setMode('circle');
            } else {
                enemy.setMode('moveToCenter');
            }
        }
        if (enemy.mode === 'chase') {
            if (!enemy.params.nextDisc) {
                enemy.setMode('choose');
                return;
            }
            if (enemy.disc === enemy.params.nextDisc) {
                enemy.setMode('choose');
            } else {
                const disc = enemy.disc, nextDisc = enemy.params.nextDisc;
                if (doCirclesIntersect(enemy, nextDisc)) {
                    // Move to the center of the next disc until assigned to this disc.
                    moveEnemyToTargetWithoutTurning(state, enemy, nextDisc);
                } else {
                    // Move to the connecting point between the current and next disc.
                    // The denominator here should technically be the distance between discs.
                    const p = disc.radius / (disc.radius + nextDisc.radius);
                    moveEnemyToTargetWithoutTurning(state, enemy, {
                        x: disc.x + p * (nextDisc.x - disc.x),
                        y: disc.y + p * (nextDisc.y - disc.y),
                    });
                }
            }
            // This probably won't happen, but just in case, switch back to choose to try
            // and get unstuck.
            if (enemy.modeTime >= 5000) {
                enemy.setMode('choose');
            }
        }
        if (enemy.mode === 'moveToCenter') {
            if (moveEnemyToTargetWithoutTurning(state, enemy, enemy.disc)) {
                enemy.setMode('centerAttack');
            }
        }
        if (enemy.mode === 'circle') {
            const {x, y, distance2} = getTargetVector(enemy, enemy.disc);
            const discTheta = Math.atan2(y, x);
            if (distance2 > (0.75 * enemy.disc.radius) ** 2) {
                moveEnemyInDirection(state, enemy, discTheta +  Math.PI / 3, enemy.speed);
            } else if (distance2 < (0.5 * enemy.disc.radius) ** 2) {
                moveEnemyInDirection(state, enemy, discTheta + 2 * Math.PI / 3, enemy.speed);
            } else {
                moveEnemyInDirection(state, enemy, discTheta + Math.PI / 2, enemy.speed);
            }
            if (enemy.attackCooldown <= state.fieldTime) {
                enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                //shootBulletArc(state, enemy, discTheta, Math.PI / 3, 3, 0.5 * window.BASE_ENEMY_BULLET_SPEED, {
                //    duration: 2000,
                //});
                shootBulletArc(state, enemy, discTheta, 2 * Math.PI / 3, 3, 2 * window.BASE_ENEMY_BULLET_SPEED, {
                    warningTime: 1500,
                    duration: 1500,
                    friction: 0.8,
                    radius: 1 * window.BASE_ENEMY_BULLET_RADIUS,
                    onDeath(state: GameState, bullet: Bullet) {
                        shootBulletCircle(state, enemy, Math.random() * 2 * Math.PI, 6, 0.5 * window.BASE_ENEMY_BULLET_SPEED, {
                            baseX: bullet.x,
                            baseY: bullet.y,
                            x: bullet.x,
                            y: bullet.y,
                            duration: 3000,
                        });
                    },
                });
            }
            if (enemy.disc !== state.hero.disc && enemy.modeTime >= 2000) {
                enemy.setMode('chase');
            } else if (enemy.modeTime >= 5000) {
                enemy.setMode('choose');
            }
        }
        if (enemy.mode === 'centerAttack') {
           /* if (enemy.modeTime % 500 === 0) {
                shootBulletCircle(state, enemy, Math.random() * 2 * Math.PI, 10, 0.5 * window.BASE_ENEMY_BULLET_SPEED, {
                    duration: 3000,
                });
            }*/
            if (enemy.attackCooldown <= state.fieldTime) {
                enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                shootBulletAtHeroHeading(state, enemy, 2 * window.BASE_ENEMY_BULLET_SPEED, 0.2, {
                    warningTime: 1500,
                    duration: 1500,
                    friction: 0.8,
                    radius: 1.5 * window.BASE_ENEMY_BULLET_RADIUS,
                    onDeath(state: GameState, bullet: Bullet) {
                        shootBulletCircle(state, enemy, Math.random() * 2 * Math.PI, 10, 0.8 * window.BASE_ENEMY_BULLET_SPEED, {
                            baseX: bullet.x,
                            baseY: bullet.y,
                            x: bullet.x,
                            y: bullet.y,
                            duration: 3000,
                        });
                        shootBulletCircle(state, enemy, Math.random() * 2 * Math.PI, 6, 0.5 * window.BASE_ENEMY_BULLET_SPEED, {
                            baseX: bullet.x,
                            baseY: bullet.y,
                            x: bullet.x,
                            y: bullet.y,
                            duration: 3000,
                        });
                    },
                });
            }
            if (enemy.disc !== state.hero.disc && enemy.modeTime >= 2000) {
                enemy.setMode('chase');
            } else if (enemy.modeTime >= 5000) {
                enemy.setMode('choose');
            }
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => {
        fillCircle(context, {x: 0, y: 0, radius: 100}, 'black');
        context.fillStyle = enemy.baseColor;

        context.beginPath();
        context.moveTo(-45, -50);
        context.lineTo(-45, -90);
        context.lineTo(-15, -50);
        context.fill();

        context.beginPath();
        context.moveTo(45, -50);
        context.lineTo(45, -90);
        context.lineTo(15, -50);
        context.fill();


        context.beginPath();
        context.moveTo(0, 10);
        context.lineTo(-80, -60);
        context.lineTo(-80, 60);
        context.fill();


        context.beginPath();
        context.moveTo(0, 10);
        context.lineTo(80, -60);
        context.lineTo(80, 60);
        context.fill();

        context.beginPath();
        context.moveTo(-45, -50);
        context.lineTo(-10, 75);
        context.lineTo(10, 75);
        context.lineTo(45, -50);
        context.fill();
        context.lineWidth = 5;
        context.strokeStyle = 'black';
        context.stroke();



        context.fillStyle = 'black';
        context.beginPath();
        context.arc(-15, -20, 10, Math.PI / 3, 4 * Math.PI / 3);
        context.fill();
        context.beginPath();
        context.arc(15, -20, 10, -Math.PI / 3, 2 * Math.PI / 3);
        context.fill();
    }),
};

