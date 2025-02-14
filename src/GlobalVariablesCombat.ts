///////////////////////////////////////////////////////////////////////////////////////////////
// Grid Configuration
///////////////////////////////////////////////////////////////////////////////////////////////
export const GRID_WIDTH = 8; // Number of tiles horizontally
export const GRID_HEIGHT = 5; // Number of tiles vertically
export const CELL_SIZE = 116; // Pixel size of each tile
//  (Previously: 128px | 116px (24px of extra space for UI, both vertical and horizontal))

// Default Tile Colors
export const TILE_COLOR_DEFAULT = 0xc7f2c9; // Pale green (default tile color)
export const TILE_COLOR_HIGHLIGHT_OK = 0x7cd4de; // Light Cyan (hover or movement highlight)
export const TILE_COLOR_DEFAULT_INVALID = 0xde7c7c; // Red (invalid movement highlight)

// Unit Highlight Colors
export const UNIT_COLOR_HIGHLIGHT_CURRENT = 0xebfc00; // Yellow (unit highlight while it is its current turn)

// Trap Tile Colors
export const TILE_COLOR_TRAP = 0xffd700; // Gold (trapped tile color)

///////////////////////////////////////////////////////////////////////////////////////////////
// UI Configuration
///////////////////////////////////////////////////////////////////////////////////////////////
export const UI_OFFSET_BOTTOM = 50; // Space between grid and bottom UI
export const UI_ABILITY_SLOT_SIZE = 64; // Pixel size of ability slot buttons

///////////////////////////////////////////////////////////////////////////////////////////////
// Game Settings
///////////////////////////////////////////////////////////////////////////////////////////////
export const DEFAULT_TURN_DURATION = 30; // Duration of a turn in seconds
export const ABILITY_COOLDOWN_TIME = 1000; // Default cooldown for abilities in milliseconds