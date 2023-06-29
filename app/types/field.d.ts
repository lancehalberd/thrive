interface FieldText {
    x: number
    y: number
    vx: number
    vy: number
    expirationTime: number
    time: number
    text: string
    color?: string
    borderColor?: string
}

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
    holes: Hole[]
}

interface Hole extends Geometry {
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
