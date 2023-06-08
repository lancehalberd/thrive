import { fillCircle } from 'app/render/renderGeometry';


export const chest: EnemyDefinition = {
    name: 'Chest',
    statFactors: {},
    initialParams: {},
    dropChance: 1,
    experienceFactor: 0,
    radius: 24,
    update(state: GameState, enemy: Enemy): void {
    },
    render(context: CanvasRenderingContext2D, state: GameState, enemy: Enemy): void {
        fillCircle(context, enemy, 'black');
        fillCircle(context, {...enemy, radius: 20}, 'pink');
        fillCircle(context, {...enemy, radius: 6}, 'black');
    }
};
