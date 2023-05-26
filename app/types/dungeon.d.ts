
interface Entrance extends Geometry {

}

interface Dungeon {
    name: string
    level: number
    discs: Disc[]
    entrance: Entrance
    enemies: Enemy[]
    portals: Portal[]
}

interface Portal extends Geometry {
    level: number
    name: string
    activate(state: GameState): void
}
