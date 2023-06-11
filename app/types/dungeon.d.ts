
interface Disc extends Geometry {
    level: number
    name: string
    links: Disc[]
    enemies: Enemy[]
    portals: Portal[]
    loot: Loot[]
    boss?: Enemy
    update?: (state: GameState, disc: Disc) => void
    color?: string
    centerColor?: string
    topEdgeColor?: string
    bottomEdgeColor?: string
}

interface Biome {
    name: string
    color?: string
    centerColor?: string
    topEdgeColor?: string
    bottomEdgeColor?: string
}

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

type DungeonType = 'reef'|'cave'|'tree'|'arena'|'spiderDen';
