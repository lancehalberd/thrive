import { BASE_MAX_POTIONS, BASE_XP } from 'app/constants';


export function gainExperience(state: GameState, experience: number): void {
    let requiredExperience = getExperienceForNextLevel(state.hero.level);
    // You cannot gain more than 100% of the experience for the next level at once.
    state.hero.experience += Math.min(experience, requiredExperience);
    if (state.hero.experience >= requiredExperience) {
        state.hero.level++;
        state.hero.experience -= requiredExperience;
        setDerivedHeroStats(state);
        refillAllPotions(state);
    }
}

export function setDerivedHeroStats(state: GameState): void {
    state.hero.damage = Math.pow(1.05, state.hero.level - 1);
    state.hero.attacksPerSecond = 1 + 0.01 * state.hero.level;
    state.hero.maxLife = 20 * state.hero.level;
    state.hero.life = state.hero.maxLife;
}

export function getExperienceForNextLevel(currentLevel: number): number {
    const averageKills = 10 * currentLevel;
    const xpPerKill = Math.ceil(BASE_XP * Math.pow(1.2, currentLevel - 1));
    return averageKills * xpPerKill;
}

export function refillAllPotions(state: GameState): void {
    state.hero.life = state.hero.maxLife;
    state.hero.potions = BASE_MAX_POTIONS;
}
