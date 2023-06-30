import { playSound } from 'app/utils/audio';
import { chargeGuardSkill, getGuardSkillCooldownTime } from 'app/utils/guardSkill';

export function damageHero(state: GameState, damage: number): void {
    damage = applyArmorToDamage(state, damage, state.hero.armor);

    // Incoming damage is limited by both the amount of the damage and the players total health.
    // Shots that deal X damage only deal damage if the player has taken less than 2X damage recently.
    // A player cannot take more than 50% of their health over their recorded damage history.
    const damageCap = Math.min(Math.floor(state.hero.maxLife / 2), 2 * damage);
    const damageTaken = Math.max(0, Math.min(damage, damageCap - state.hero.recentDamageTaken));
    if (damageTaken <= 0) {
        return;
    }
    if (damageTaken < 0.25 * state.hero.life) {
        playSound(state, 'takeDamage');
    } else {
        playSound(state, 'takeBigDamage');
    }
    addDamageNumber(state, state.hero, damageTaken);

    applyDamageToHero(state, damageTaken);
}

export function damageHeroOverTime(state: GameState, damage: number): void {
    // Incoming damage over time is limited only by player health.
    const damageCap = Math.floor(state.hero.maxLife / 2);
    const damageTaken = Math.max(0, Math.min(damage, damageCap - state.hero.recentDamageTaken));
    if (damageTaken <= 0) {
        return;
    }
    applyDamageToHero(state, damageTaken);
}

export function applyDamageToHero(state: GameState, damage: number): void {
    state.hero.life -= damage;
    if (state.hero.life < 0) {
        state.hero.life = 0;
    }
    state.hero.damageHistory[0] += damage;
    state.hero.recentDamageTaken += damage;
    const p = 2 * damage / state.hero.maxLife;
    chargeGuardSkill(state, p * getGuardSkillCooldownTime(state));
}

export function addDamageNumber(state: GameState, target: Geometry, damage: number, isCrit = false): void {
    state.fieldText.push({
        x: target.x - 5 + Math.random() * 10,
        y: target.y - 10,
        vx: 2 * Math.random() - 1,
        vy: -1,
        text: abbreviate(Math.round(damage)),
        color: isCrit ? 'yellow' : 'red',
        borderColor: 'black',
        expirationTime: state.fieldTime + 500,
        time: 0,
    });
}

export function applyArmorToDamage(state: GameState, damage: number, armor: number): number {
    return Math.max(Math.ceil(damage / 10), damage - armor);
}

export function fixedDigits(number: number, digits: number = 1): number {
    return parseFloat(number.toFixed(digits));
}

export function abbreviate(number: number, digits?: number): string {
    if (typeof(digits) === 'number') {
        number = fixedDigits(number, digits);
    }
    if (number >= 1000000000000) {
        return (number / 1000000000000 + '').slice(0, 4) + 'T';
    }
    if (number >= 1000000000) {
        return (number / 1000000000 + '').slice(0, 4) + 'B';
    }
    if (number >= 1000000) {
        return (number / 1000000 + '').slice(0, 4) + 'M';
    }
    if (number >= 10000) {
        return (number / 1000 + '').slice(0, 4) + 'K';
    }
    return `${number}`;
}

export function abbreviateHealth(number: number, digits?: number): string {
    if (typeof(digits) === 'number') {
        number = fixedDigits(number, digits);
    }
    if (number >= 1000000000000) {
        return (number / 1000000000 + '').slice(0, 4) + 'B';
    }
    if (number >= 1000000000) {
        return (number / 1000000 + '').slice(0, 4) + 'M';
    }
    if (number >= 1000000) {
        return (number / 1000 + '').slice(0, 4) + 'K';
    }
    return `${number}`;
}

export function rollForCritDamage(state: GameState, additionalCritchance: number = 0): number {
    const weapon = state.hero.equipment.weapon;
    const isCrit = Math.random() < additionalCritchance + state.hero.critChance + weapon.critChance;
    if (!isCrit) {
        return 1;
    }
    return 1 + state.hero.critDamage + weapon.critDamage;
}
