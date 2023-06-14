

export function addDamageNumber(state: GameState, target: Geometry, damage: number, isCrit = false): void {
    state.fieldText.push({
        x: target.x - 5 + Math.random() * 10,
        y: target.y - 10,
        vx: 2 * Math.random() - 1,
        vy: -1,
        text: abbreviate(damage),
        color: isCrit ? 'yellow' : 'red',
        borderColor: 'black',
        expirationTime: state.fieldTime + 500,
        time: 0,
    });
}

export function applyArmorToDamage(state: GameState, damage: number, armor: number): number {
    return Math.max(Math.ceil(damage / 10), Math.round(damage - armor));
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

export function rollForCritDamage(state: GameState, additionalCritchance: number = 0): number {
    const weapon = state.hero.equipment.weapon;
    const isCrit = Math.random() < additionalCritchance + state.hero.critChance + weapon.critChance;
    if (!isCrit) {
        return 1;
    }
    return 1 + state.hero.critDamage + weapon.critDamage;
}
