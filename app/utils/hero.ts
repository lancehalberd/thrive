import { BASE_XP } from 'app/constants';


export function gainExperience(state: GameState, experience: number): void {
    let requiredExperience = getExperienceForNextLevel(state.hero.level);
    // You cannot gain more than 100% of the experience for the next level at once.
    state.hero.experience += Math.min(experience, requiredExperience);
    if (state.hero.experience >= requiredExperience) {
        state.hero.level++;
        state.hero.experience -= requiredExperience;
        state.hero.damage = Math.ceil(20 * Math.pow(1.05, state.hero.level));
        state.hero.attacksPerSecond = 2 + 0.02 * state.hero.level;
        state.hero.maxLife = 20 * (state.hero.level + 1);
        state.hero.life = state.hero.maxLife;
    }
}

export function getExperienceForNextLevel(currentLevel: number): number {
    const averageKills = 10 * (currentLevel + 1);
    const xpPerKill = Math.ceil(BASE_XP * Math.pow(1.2, currentLevel));
    return averageKills * xpPerKill;
}


