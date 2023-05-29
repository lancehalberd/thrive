

export function addDamageNumber(state: GameState, target: Geometry, damage: number): void {
    state.fieldText.push({
        x: target.x - 5 + Math.random() * 10,
        y: target.y - 10,
        vx: 2 * Math.random() - 1,
        vy: -1,
        text: `${damage}`,
        color: 'red',
        borderColor: 'black',
        expirationTime: state.fieldTime + 1000,
        time: 0,
    });
}

export function applyArmorToDamage(state: GameState, damage: number, armor: number): number {
    return Math.max(Math.ceil(damage / 10), Math.round(damage - armor));
}
