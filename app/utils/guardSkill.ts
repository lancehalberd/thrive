import { GAME_KEY } from 'app/constants';
import { uniqueEnchantmentHash } from 'app/uniqueEnchantmentHash';
import { doCirclesIntersect } from 'app/utils/geometry';
import { getTotalProficiency } from 'app/utils/hero';
import { getMovementDeltas, wasGameKeyPressed } from 'app/utils/userInput';

export function getMaxGuardSkillCharges(state: GameState): number {
    if (state.hero.equipment.armor.armorType === 'lightArmor') {
        return 3;
    }
    if (state.hero.equipment.armor.armorType === 'mediumArmor') {
        return 2;
    }
    return 1;
}

export function getGuardSkillCooldownTime(state: GameState): number {
    if (state.hero.equipment.armor.armorType === 'lightArmor') {
        const bonus = getTotalProficiency(state, 'lightArmor');
        const multiplier = 100 / (100 + bonus);
        if (state.hero.guardSkill.charges === 0) {
            return multiplier * 3000;
        } else if (state.hero.guardSkill.charges === 1) {
            return multiplier * 5000;
        }
        return multiplier * 7000;
    }
    if (state.hero.equipment.armor.armorType === 'mediumArmor') {
        if (state.hero.guardSkill.charges === 0) {
            return 4000;
        } else {
            return 6000;
        }
    }
    if (state.hero.equipment.armor.armorType === 'heavyArmor') {
        return 5000;
    }
    return 5000;
}

export function updateGuardSkill(state: GameState): void {
    const guardSkill = state.hero.guardSkill;
    if (state.hero.roll) {
        state.hero.roll.time += window.FRAME_LENGTH;
        const roll = state.hero.roll;
        const p = roll.time / roll.duration;
        state.hero.x = roll.start.x + p * (roll.goal.x - roll.start.x);
        state.hero.y = roll.start.y + p * (roll.goal.y - roll.start.y);
        if (p >= 1) {
            delete state.hero.roll;
        }
    } else if (guardSkill.duration) {
        guardSkill.time += window.FRAME_LENGTH;
        if (guardSkill.time >= guardSkill.duration) {
            guardSkill.duration = 0;
            // Remove the guard skill effect.
            state.hero.armor = Math.min(state.hero.armor, state.hero.baseArmor);
        }
        if (state.hero.equipment.armor.armorType === 'mediumArmor') {
            const circle = getDispersionCircle(state);
            state.enemyBullets = state.enemyBullets.filter(bullet => !doCirclesIntersect(circle, bullet));
        }
    } else {
        chargeGuardSkill(state, window.FRAME_LENGTH);
        if (guardSkill.charges > 0 && wasGameKeyPressed(state, GAME_KEY.GUARD_SKILL)) {
            useGuardSkill(state);
        }
    }
}

export function chargeGuardSkill(state: GameState, milliseconds: number): void {
    const guardSkill = state.hero.guardSkill;
    if (guardSkill.charges < getMaxGuardSkillCharges(state)) {
        guardSkill.cooldownTime += milliseconds;
        if (guardSkill.cooldownTime >= getGuardSkillCooldownTime(state)) {
            guardSkill.cooldownTime = 0;
            guardSkill.charges++;
        }
    }
}

const maxRollDistance = 200;
const baseDispersionRadius = 100;
const baseShieldDuration = 2000;

export function getDispersionCircle(state: GameState): Circle {
    const bonus = getTotalProficiency(state, 'mediumArmor');
    return {
        x: state.hero.x,
        y: state.hero.y,
        radius: state.hero.guardSkill.duration
            ? baseDispersionRadius * state.hero.guardSkill.time / state.hero.guardSkill.duration * (1 + bonus / 100)
            : 0,
    }
}

export function useGuardSkill(state: GameState): void {
    let skipRegularGuard = false;
    for (const enchantment of state.hero.uniqueEnchantments) {
        const definition = uniqueEnchantmentHash[enchantment.uniqueEnchantmentKey];
        skipRegularGuard = skipRegularGuard || !!definition.onActivateGuardSkill?.(state, enchantment);
    }
    if (skipRegularGuard) {
        return;
    }
    const guardSkill = state.hero.guardSkill;
    guardSkill.charges--;
    if (state.hero.equipment.armor.armorType === 'lightArmor') {
        /*let rollDx = state.mouse.x - window.FIELD_CENTER.x, rollDy = state.mouse.y - window.FIELD_CENTER.y;
        const magnitude = Math.sqrt(rollDx * rollDx + rollDy * rollDy);
        if (magnitude > maxRollDistance) {
            rollDx *= maxRollDistance / magnitude;
            rollDy *= maxRollDistance / magnitude;
        }*/
        let [dx, dy] = getMovementDeltas(state);
        const m = Math.sqrt(dx * dx + dy * dy);
        if (m > 1) {
            dx /= m;
            dy /= m;
        }
        const rollDx = maxRollDistance * dx, rollDy = maxRollDistance * dy;
        state.hero.roll = {
            start: {x: state.hero.x, y: state.hero.y},
            goal: {x: state.hero.x + rollDx, y: state.hero.y + rollDy},
            time: 0,
            duration: 200,
        };
        return;
    }
    if (state.hero.equipment.armor.armorType === 'mediumArmor') {
        state.hero.guardSkill.duration = 300;
        state.hero.guardSkill.time = 0;
        return;
    }
    if (state.hero.equipment.armor.armorType === 'heavyArmor') {
        const bonus = getTotalProficiency(state, 'heavyArmor');
        guardSkill.duration = baseShieldDuration * (1 + bonus / 100);
        guardSkill.time = 0;
        state.hero.armor = state.hero.baseArmor * 10;
        return;
    }
}
