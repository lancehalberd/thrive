import { BASE_DROP_CHANCE } from 'app/constants';
import { allWeapons } from 'app/weapons';
import Random  from 'app/utils/Random';
import { fillCircle } from 'app/render/renderGame';


export function checkToDropBasicLoot(state: GameState, source: Enemy): void {
    if (Math.random() < (source.definition.dropChance ?? BASE_DROP_CHANCE)) {
        const weaponType = Random.element(allWeapons);
        let weaponIndex = 0;
        for (;weaponIndex < allWeapons.length - 1; weaponIndex++) {
            if (weaponType[weaponIndex + 1].level > source.level && Math.random() >= BASE_DROP_CHANCE) {
                break;
            }
        }
        const weapon = weaponType[weaponIndex];
        state.loot.push({
            type: 'weapon',
            x: source.x,
            y: source.y,
            radius: 12,
            weapon,
            activate(state: GameState, loot: WeaponLoot): void {
                const temp = state.hero.weapon;
                state.hero.weapon = loot.weapon;
                loot.weapon = temp;
            },
            render(context: CanvasRenderingContext2D, state: GameState, loot: WeaponLoot): void {
                fillCircle(context, loot, 'gold');
                if (state.activeLoot === loot) {
                    context.fillStyle = '#88F';
                    context.textBaseline = 'middle';
                    context.textAlign = 'center';
                    context.font = '16px sans-serif';
                    context.fillText(loot.weapon.name, loot.x, loot.y);
                } else {
                    context.fillStyle = '#88F';
                    context.textBaseline = 'middle';
                    context.textAlign = 'center';
                    context.font = '16px sans-serif';
                    context.fillText(loot.weapon.type.charAt(0).toUpperCase() + loot.weapon.level, loot.x, loot.y);
                }
            },
            getLevel(loot: WeaponLoot): number {
                return weapon.level;
            }
        });
    }
}
