import { BASE_MAX_POTIONS, BASE_XP } from 'app/constants';
import { addDamageNumber, applyArmorToDamage } from 'app/utils/combat';


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

export function gainItemExperience(state: GameState, level: number): void {
    const experiencePenalty = Math.min(1, Math.max(0, (state.hero.level - level) * 0.1));
    gainExperience(state,
        Math.ceil(BASE_XP * (1 - experiencePenalty) * Math.pow(1.2, level) * 1.5)
    );
}

export function setDerivedHeroStats(state: GameState): void {
    state.hero.damage = Math.pow(1.05, state.hero.level - 1);
    state.hero.attacksPerSecond = 1 + 0.01 * state.hero.level;
    const lifePercentage = state.hero.life / state.hero.maxLife;
    state.hero.maxLife = 20 * state.hero.level;
    state.hero.armor = 0;
    state.hero.speed = 100;

    const armor = state.hero.equipment.armor;
    if (armor) {
        state.hero.maxLife += armor.life;
        state.hero.armor += armor.armor;
        state.hero.speed *= armor.speedFactor;
    } else {
        state.hero.speed *= 1.2;
    }
    state.hero.life = Math.round(lifePercentage * state.hero.maxLife);
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

export function damageHero(state: GameState, damage: number): void {
    damage = applyArmorToDamage(state, damage, state.hero.armor);

    // Incoming damage is limited by both the amount of the damage and the players total health.
    // Shots that deal X damage only deal damage if the player has taken less than 2X damage recently.
    // A player cannot take more than 50% of their health over their recorded damage history.
    const damageCap = Math.min(state.hero.maxLife / 2, 2 * damage);
    const damageTaken = Math.max(0, Math.min(damage, damageCap - state.hero.recentDamageTaken));
    state.hero.life -= damageTaken;
    if (state.hero.life < 0) {
        state.hero.life = 0;
    }
    state.hero.damageHistory[0] += damageTaken;
    state.hero.recentDamageTaken += damageTaken;
    addDamageNumber(state, state.hero, damageTaken);
}
