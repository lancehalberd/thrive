type Coords = number[];

interface Rect {
    x: number
    y: number
    w: number
    h: number
}

interface Circle {
    x: number
    y: number
    radius: number
}

interface Geometry extends Circle {
    // The disc this object is currently on.
    disc?: Disc
}

interface Point {
    x: number
    y: number
}
