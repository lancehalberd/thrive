
interface Entrance extends Geometry {

}

interface Dungeon {
    discs: Disc[]
    entrance: Entrance
    enemies: Enemy[]
}
