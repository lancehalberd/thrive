
interface Entrance extends Geometry {

}

interface WorldCell {
    level: number
    x: number
    y: number
    discs: Disc[]
}


interface Dungeon {
    name: string
    level: number
    discs: Disc[]
    entrance: Entrance
}

interface Portal extends Geometry {
    name: string
    disc: Disc
    dungeon?: Dungeon
    activate(state: GameState): void
}

type DungeonType = 'reef'|'cave'|'tree';
