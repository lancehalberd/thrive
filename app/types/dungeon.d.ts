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

type DungeonType = 'reef'|'pearlTrove'|'caveOfWanderers'|'cave'|'tree'|'arena'|'spiderDen';
