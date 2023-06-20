
export function rollWithMissBonus(state: GameState, key: string, baseChance: number): boolean {
    if (baseChance <= 0) {
        return false;
    }
    const missBonus = (state.missedRolls[key] ?? 0);
    const roll = Math.random();
    // console.log('rolled', roll, ' against ', baseChance, '+', missBonus, ' for ', key);
    if (roll < baseChance) {
        return true;
    }
    if (roll < baseChance + missBonus) {
        state.missedRolls[key] = Math.max(0, missBonus - (roll - baseChance));
        return true;
    }
    state.missedRolls[key] = missBonus + baseChance / 10;
    return false;
}
