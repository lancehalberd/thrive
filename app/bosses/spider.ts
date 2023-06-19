import { BASE_DROP_CHANCE, BASE_ENEMY_BULLET_RADIUS, BASE_ENEMY_BULLET_SPEED, BOSS_MAX_LIFE_FACTOR, FRAME_LENGTH } from 'app/constants';
import { getThiefEnchantment } from 'app/enchantments';
import { fillCircle } from 'app/render/renderGeometry';
import {
    chaseHeroHeading,
    createEnemy,
    isEnemyOffDisc,
    moveEnemyToTarget,
    shootBulletCircle, createBombBullet, renderNormalizedEnemy, shootBulletAtHero, shootCirclingBullet,
} from 'app/utils/enemy';
import { getTargetVector } from 'app/utils/geometry';
import Random from 'app/utils/Random';
import { updateReturnBullet } from 'app/weapons';

const attackModes = <const>['novas','pinwheels','petals'];
type AttackMode = (typeof attackModes[number])|'choose';

interface SpiderParams {
    attackTime: number
    attackMode: AttackMode
    attackSchedule: AttackMode[]
    attackIntensity: number
    bombIntensity: number
}
export const spider: EnemyDefinition<SpiderParams> = {
    name: 'Spider',
    statFactors: {
        maxLife: BOSS_MAX_LIFE_FACTOR,
        damage: 1,
    },
    initialParams: {
        attackTime: 0,
        attackMode: 'choose',
        attackSchedule: [],
        attackIntensity: 0,
        bombIntensity: 0,
    },
    dropChance: 1,
    experienceFactor: 20,
    radius: 48,
    update(state: GameState, enemy: Enemy<SpiderParams>): void {
        const nextAttack = () => {
            if (!enemy.params.attackSchedule.length) {
                enemy.params.attackSchedule = Random.shuffle([...attackModes]);
            }
            enemy.params.attackMode = enemy.params.attackSchedule.pop()!;
            enemy.params.attackTime = 0;
            enemy.params.attackIntensity = (enemy.life <= enemy.maxLife / 2) ? 1 : 0;
        };
        enemy.params.attackTime += FRAME_LENGTH;
        if (enemy.params.attackMode === 'novas') {
            const spacing = 800 - enemy.params.attackIntensity * 400;
            if (enemy.params.attackTime % spacing === 0 && enemy.params.attackTime <= 3000) {
                const count = 10;
                const parity = [0, 2, 1, 3][(enemy.params.attackTime / spacing) % 4];
                shootBulletCircle(state, enemy, parity * 2 * Math.PI / count / 4, count, 0.6 * BASE_ENEMY_BULLET_SPEED, {expirationTime: state.fieldTime + 3000});
            }
            if (enemy.params.attackTime >= 3500) {
                nextAttack();
            }
        } else if (enemy.params.attackMode === 'petals') {
            const spacing = 200;
            if (enemy.params.attackTime > spacing * 5 && enemy.params.attackTime % spacing === 0 && enemy.params.attackTime <= spacing * 35) {
                const count = 3 + enemy.params.attackIntensity * 2;
                shootBulletCircle(state, enemy, enemy.params.attackTime / spacing * 2 * Math.PI / 40, count, 1.1 * BASE_ENEMY_BULLET_SPEED, {
                    expirationTime: state.fieldTime + 3000,
                    update: updateReturnBullet,
                });
            }
            if (enemy.params.attackTime >= spacing * 45) {
                nextAttack();
            }
        } else if (enemy.params.attackMode === 'pinwheels') {
            const spacing = 2000;
            if (enemy.params.attackTime % spacing === FRAME_LENGTH && enemy.params.attackTime < spacing * 4) {
                const count = 3 + enemy.params.attackIntensity;
                for (let r = 20; r < enemy.radius + 450; r += 40) {
                    for (let i = 0; i < count; i++) {
                        shootCirclingBullet(state, enemy, 2 * Math.PI * i / count + r * Math.PI / 40 / 20, r, {
                            vTheta: - Math.PI / count,
                            warningTime: 1000,
                            expirationTime: state.fieldTime + 3000,
                        });
                    }
                }
            }
            if (enemy.params.attackTime >= spacing * 6) {
                nextAttack();
            }
        } else {
            nextAttack();
        }
        // Face away from the disc.
        const vtheta = Math.PI / 200 * (1.5 -  0.5 * enemy.life / enemy.maxLife);
        enemy.theta += vtheta;
        const targetRadius = Math.round(enemy.params.attackMode === 'petals' ? 0 : 150 * (1 - enemy.life / enemy.maxLife));
        const {distance2} = getTargetVector(enemy, enemy.disc);
        let radius = Math.sqrt(distance2);
        if (radius < targetRadius) radius++;
        else if ( radius > targetRadius) radius--;
        enemy.x = enemy.disc.x + radius * Math.cos(enemy.theta);
        enemy.y = enemy.disc.y + radius * Math.sin(enemy.theta);
        if (enemy.mode === 'choose') {
            const p = enemy.life / enemy.maxLife;
            if (enemy.modeTime >= 1000 && p <= 0.9) {
                const modes = ['random'];
                if (p <= 0.33) {
                    enemy.params.bombIntensity = 2;
                    modes.push('spiral');
                } else if (p <= 0.66) {
                    enemy.params.bombIntensity = 1;
                    modes.push('rings')
                }
                enemy.setMode(Random.element(modes));
            }
        }
        if (enemy.mode === 'spiral') {
            const time = enemy.modeTime;
            const totalTime = 5000;
            const spacing = 60;
            if (enemy.modeTime % spacing === 0) {
                const count = totalTime / spacing;
                const t = time / spacing;
                const r = 50 + 350 * t / count;

                const arms = 2 +  enemy.params.bombIntensity;
                for (let i = 0; i < arms; i++) {
                    const theta = 8 * Math.PI * t / count - r / Math.PI / 3 + 2 * Math.PI * i / arms;
                    createBombBullet(state, enemy, enemy.disc.x + r * Math.cos(theta), enemy.disc.y + r * Math.sin(theta), {
                        warningTime: 1000,
                        expirationTime: state.fieldTime + 1200,
                    });
                }
            }
            if (enemy.modeTime >= totalTime) {
                enemy.setMode('choose');
            }
        }
        if (enemy.mode === 'rings') {
            const totalTime = 5000;
            const time = enemy.modeTime;
            const bombSpacing = 800 - 100 * enemy.params.bombIntensity;
            if (enemy.modeTime % bombSpacing === 0) {
                const t = time / bombSpacing;
                const r = 50 + t * 350 / (totalTime / bombSpacing);
                const count = Math.floor(2 * Math.PI * r / (2 * 3 * BASE_ENEMY_BULLET_RADIUS));
                for (let i = 0; i < count; i++) {
                    const theta = 2 * Math.PI * (i + (t % 2) * 0.5) / count;
                    createBombBullet(state, enemy, enemy.disc.x + r * Math.cos(theta), enemy.disc.y + r * Math.sin(theta), {
                        warningTime: 1000,
                        expirationTime: state.fieldTime + 1200,
                    });
                }
            }
            if (enemy.modeTime >= totalTime) {
                enemy.setMode('choose');
            }
        }
        if (enemy.mode === 'random') {
            const totalTime = 5000;
            const bombSpacing = 1200 - 300 * enemy.params.bombIntensity;
            if (enemy.modeTime % bombSpacing === 0) {
                const dr = 100 - 70 * (1 - enemy.life / enemy.maxLife);
                for (let r = 50; r < 400; r += dr) {
                    const theta = Math.random() * 2 * Math.PI;
                    createBombBullet(state, enemy, enemy.disc.x + r * Math.cos(theta), enemy.disc.y + r * Math.sin(theta));
                }
            }
            if (enemy.modeTime >= totalTime) {
                enemy.setMode('choose');
            }
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => renderNormalizedSpider(context, enemy, 4)),
    getEnchantment(state: GameState, enemy: Enemy): Enchantment {
        return getThiefEnchantment(state, enemy.level);
    },
};


function renderNormalizedSpider(context: CanvasRenderingContext2D, enemy: Enemy, eyeCount: number): void {

    // Black circle
    fillCircle(context, {x: 0, y: 0, radius: 1}, 'black');

    // Colored "split mask halves"
    context.fillStyle = enemy.baseColor;
    context.beginPath();
    context.arc(0, 0, 0.8, Math.PI / 24, 23 * Math.PI / 24);
    context.fill();
    context.beginPath();
    context.arc(0, 0, 0.8, 25 * Math.PI / 24, 47 * Math.PI / 24);
    context.fill();

    // 4 eyes on each mask half
    context.fillStyle = 'black';
    for (let i = 0; i < eyeCount; i++) {
        const thetaSpace = 5 * Math.PI / 6 / (eyeCount + 1);
        const theta = Math.PI / 12 + (1 + i) * thetaSpace;
        context.beginPath();
        const eyeAngle = Math.PI / 2 + (2 * Math.PI / 3 - Math.PI / 2) * i / eyeCount;
        const eyeRadius = 0.55;
        context.arc(eyeRadius * Math.cos(theta), eyeRadius * Math.sin(theta), 0.2, eyeAngle,  eyeAngle - Math.PI, true);
        context.fill();
        context.beginPath();
        context.arc(eyeRadius * Math.cos(-theta), eyeRadius * Math.sin(-theta), 0.2, -eyeAngle,  -(eyeAngle - Math.PI), false);
        context.fill();
        //fillCircle(context, {x: 0.6 * Math.cos(-theta), y: 0.6 * Math.sin(-theta), radius: 0.1}, 'black');
    }

}

export const babySpiderBomber: EnemyDefinition = {
    name: 'BabySpiderBomber',
    statFactors: {
    },
    initialParams: {},
    radius: 24,
    onDeath(state: GameState, enemy: Enemy): void {
        for (let r = 50; r < 150; r += 30) {
            const theta = Math.random() * 2 * Math.PI;
            createBombBullet(state, enemy, enemy.x + r * Math.cos(theta), enemy.y + r * Math.sin(theta));
        }
    },
    update(state: GameState, enemy: Enemy): void {
        const aggroRadius = 500;
        const {distance2} = getTargetVector(enemy, state.hero);
        if (distance2 > aggroRadius * aggroRadius) {
            return;
        }
        chaseHeroHeading(state, enemy);

        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootBulletAtHero(state, enemy, BASE_ENEMY_BULLET_SPEED);
        }

        const bombSpacing = 500;
        if (enemy.modeTime % bombSpacing === 0) {
            createBombBullet(state, enemy, enemy.x, enemy.y);
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => renderNormalizedSpider(context, enemy, 2)),
};

interface BabySpiderNovaParams {
    targetX: number
    targetY: number
}
export const babySpiderNova: EnemyDefinition<BabySpiderNovaParams> = {
    name: 'BabySpiderNova',
    statFactors: {
        speed: 2,
    },
    initialParams: {targetX: 0, targetY: 0},
    radius: 24,
    update(state: GameState, enemy: Enemy<BabySpiderNovaParams>): void {
        if (enemy.mode === 'choose' && enemy.modeTime >= 500) {
            const aggroRadius = 500;
            const {distance2} = getTargetVector(enemy, state.hero);
            if (distance2 > aggroRadius * aggroRadius) {
                return;
            }
            enemy.params.targetX = state.hero.x + state.hero.vx * 500 / 1000 + 24 * (0.5 - Math.random());
            enemy.params.targetY = state.hero.y + state.hero.vy * 500 / 1000 + 24 * (0.5 - Math.random());
            enemy.setMode('dash');
        }
        if (enemy.mode === 'dash') {
            if (moveEnemyToTarget(state, enemy, {x: enemy.params.targetX, y: enemy.params.targetY})) {
                enemy.setMode('attack');
            }
            if (isEnemyOffDisc(state, enemy) && enemy.modeTime >= 1000) {
                enemy.setMode('attack');
            }
        }
        if (enemy.mode === 'attack') {
            const spacing = 600;
            if (enemy.modeTime % spacing === 0) {
                const count = 7;
                const parity = [0, 2, 1, 3][(enemy.modeTime / spacing) % 4];
                shootBulletCircle(state, enemy, parity * 2 * Math.PI / count / 4, count, BASE_ENEMY_BULLET_SPEED, {expirationTime: state.fieldTime + 1000});
            }
            if (enemy.modeTime >= 3000) {
                enemy.setMode('choose');
            }
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => renderNormalizedSpider(context, enemy, 2)),
};
export const overworldSpiderNova: EnemyDefinition<BabySpiderNovaParams> = {
    name: 'OverworldSpiderNova',
    statFactors: {
        speed: 1.5,
    },
    initialParams: {targetX: 0, targetY: 0},
    radius: 24,
    portalChance: 0.1,
    portalDungeonType: 'spiderDen',
    update(state: GameState, enemy: Enemy<BabySpiderNovaParams>): void {
        if (enemy.mode === 'choose' && enemy.modeTime >= 400) {
            const aggroRadius = 400;
            const {distance2} = getTargetVector(enemy, state.hero);
            if (distance2 > aggroRadius * aggroRadius) {
                return;
            }
            enemy.params.targetX = state.hero.x + state.hero.vx * 500 / 1000 + 24 * (0.5 - Math.random());
            enemy.params.targetY = state.hero.y + state.hero.vy * 500 / 1000 + 24 * (0.5 - Math.random());
            enemy.setMode('dash');
            return;
        }
        if (enemy.mode === 'dash') {
            if (moveEnemyToTarget(state, enemy, {x: enemy.params.targetX, y: enemy.params.targetY})) {
                enemy.setMode('attack');
            }
            if (isEnemyOffDisc(state, enemy) && enemy.modeTime >= 1000) {
                enemy.setMode('attack');
            }
            return;
        }
        if (enemy.mode === 'attack') {
            // Normal directed shots at the player
            if (enemy.attackCooldown <= state.fieldTime) {
                enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
                shootBulletAtHero(state, enemy, BASE_ENEMY_BULLET_SPEED);
            }
            // Periodic novas.
            const spacing = 600;
            if (enemy.modeTime % spacing === 0) {
                const count = 7;
                const parity = [0, 2, 1, 3][(enemy.modeTime / spacing) % 4];
                shootBulletCircle(state, enemy, parity * 2 * Math.PI / count / 4, count, BASE_ENEMY_BULLET_SPEED, {expirationTime: state.fieldTime + 1000});
            }
            if (enemy.modeTime >= 2000) {
                enemy.setMode('choose');
            }
            return;
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => renderNormalizedSpider(context, enemy, 2)),
};

function upgradeBoss(state: GameState, enemy: Enemy): void {
    const boss = state.dungeon?.discs.find(d => d.boss)?.boss;
    if (!boss) {
        return;
    }
    // Every other large spider defeated upgrades the boss level by 1.
    if (boss.level === (boss.level | 0)) {
        boss.level += 0.5;
    } else {
        // Replace the boss with a higher leve version.
        boss.disc.enemies = [];
        boss.disc.boss = createEnemy(boss.x, boss.y, boss.definition, (boss.level | 0) + 1, boss.disc);
        boss.disc.boss.isBoss = true;
    }
}

export const spiderFlower: EnemyDefinition = {
    name: 'SpiderFlower',
    statFactors: {maxLife: 2},
    dropChance: 2 * BASE_DROP_CHANCE,
    experienceFactor: 5,
    initialParams: {},
    radius: 36,
    onDeath: upgradeBoss,
    update(state: GameState, enemy: Enemy): void {
        const aggroRadius = 600;
        const {distance2} = getTargetVector(enemy, state.hero);
        if (distance2 > aggroRadius * aggroRadius) {
            return;
        }
        const spacing = 200;
        if (enemy.modeTime % spacing === 0) {
            const count = 3;
            shootBulletCircle(state, enemy, enemy.modeTime / spacing * 2 * Math.PI / 40, count, 1.1 * BASE_ENEMY_BULLET_SPEED, {
                expirationTime: state.fieldTime + 3000,
                update: updateReturnBullet,
            });
        }
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootBulletAtHero(state, enemy, BASE_ENEMY_BULLET_SPEED, {radius: 1.5 * BASE_ENEMY_BULLET_RADIUS, damage: 2 * enemy.damage});
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => renderNormalizedSpider(context, enemy, 3)),
};

export const spiderPinwheel: EnemyDefinition = {
    name: 'SpiderPinwheel',
    statFactors: {maxLife: 2},
    dropChance: 2 * BASE_DROP_CHANCE,
    experienceFactor: 5,
    initialParams: {},
    radius: 36,
    onDeath: upgradeBoss,
    update(state: GameState, enemy: Enemy): void {
        const aggroRadius = 600;
        const {distance2} = getTargetVector(enemy, state.hero);
        if (distance2 > aggroRadius * aggroRadius) {
            return;
        }
        const spacing = 3000;
        if (enemy.modeTime % spacing === 0) {
            const offset = (enemy.modeTime % (2 * spacing)) / spacing;
            const count = 3
            for (let r = enemy.radius + 5; r < enemy.radius + 440; r += 40) {
                for (let i = 0; i < count; i++) {
                    shootCirclingBullet(state, enemy, 2 * Math.PI * i / count + 2 * Math.PI * offset / count / 2 + r * Math.PI / 40 / 40, r, {
                        vTheta: - Math.PI / 6,
                        warningTime: 1000,
                        expirationTime: state.fieldTime + 4000,
                    });
                }
            }
        }
        if (enemy.attackCooldown <= state.fieldTime) {
            enemy.attackCooldown = state.fieldTime + 1000 / enemy.attacksPerSecond;
            shootBulletAtHero(state, enemy, BASE_ENEMY_BULLET_SPEED, {radius: 1.5 * BASE_ENEMY_BULLET_RADIUS, damage: 2 * enemy.damage});
        }
    },
    render: renderNormalizedEnemy((context: CanvasRenderingContext2D, state: GameState, enemy: Enemy) => renderNormalizedSpider(context, enemy, 3)),
};
