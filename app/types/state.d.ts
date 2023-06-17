interface GameState {
    fieldTime: number
    hero: Hero
    heroBullets: Bullet[]
    enemies: Enemy[]
    loot: Loot[]
    activeLoot?: Loot
    holes: Circle[];
    portals: Portal[];
    enemyBullets: Bullet[]
    fieldText: FieldText[]
    worldSeed: number
    activeCells: WorldCell[]
    recentCells: WorldCell[]
    cellMap: Map<string, WorldCell>
    activeDiscs: Disc[]
    visibleDiscs: Disc[]
    dungeon?: Dungeon
    gameHasBeenInitialized: boolean
    paused: boolean
    mouse: {
        x: number
        y: number
        isDown: boolean
        wasPressed: boolean
    }
    keyboard: {
        gameKeyValues: number[]
        gameKeysDown: Set<number>
        gameKeysPressed: Set<number>
        // The set of most recent keys pressed, which is recalculated any time
        // a new key is pressed to be those keys pressed in that same frame.
        mostRecentKeysPressed: Set<number>
        gameKeysReleased: Set<number>
    }
    isUsingKeyboard?: boolean
    isUsingXbox?: boolean
    areSoundEffectsMuted?: boolean
    // Row of inventory selected when using gamepad controls
    menuRow: number
    // Column of inventory selected when using gamepad controls
    menuColumn: number
    // Set to true to select player equipment instead of inventory items with gamepad controls
    menuEquipmentSelected: boolean
    audio: {
        playingTracks: any[]
    }
}

interface MenuOption {
    // getLabel will be used instead of label if defined.
    getLabel?: () => string,
    label?: string,
    onSelect?: () => void,
    getChildren?: () => MenuOption[],
}
