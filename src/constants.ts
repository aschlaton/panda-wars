export const FACTION_COLORS = [
  0xff0000, // Red
  0x00ff00, // Green
  0x0000ff, // Blue
  0xffff00, // Yellow
] as const;

export const FACTION_COLOR_NAMES: Record<number, string> = {
  0xff0000: 'Red',
  0x00ff00: 'Green',
  0x0000ff: 'Blue',
  0xffff00: 'Yellow',
};

export function getFactionName(color: number, isNeutral: boolean, id: number): string {
  if (isNeutral) {
    return 'Neutral';
  }
  return FACTION_COLOR_NAMES[color] || `Faction ${id}`;
}

export const MAP_WIDTH = 150;
export const MAP_HEIGHT = 80;

// World generation
export const WORLD_OCTAVES = 5;

// Terrain elevation thresholds
export const ELEVATION_THRESHOLDS = {
  WATER: 0.4,
  GRASS: 0.55,
  FOREST: 0.75,
} as const;

// Zoom settings (higher = more zoomed in)
export const MIN_ZOOM = 2;
export const MAX_ZOOM = 10;
export const ZOOM_DELTA = 0.1; // How much to zoom per scroll

// Renderer settings
export const MAP_SCALE_MULTIPLIER = 1.25; // Makes map larger than viewport
export const HEX_BORDER_WIDTH = 0.1;
export const HEX_BORDER_COLOR = 0x666666;

// Minimap settings
export const MINIMAP_WIDTH = 200;
export const MINIMAP_OVERLAY_COLOR = 0x000000;
export const MINIMAP_OVERLAY_ALPHA = 0.3;
export const MINIMAP_BORDER_COLOR = 0x666666;

// Transition settings
export const TRANSITION_SPEED = 0.15;
export const TRANSITION_THRESHOLD = 0.5;

// Combat settings
export const COMBAT_TYPE_ADVANTAGE_MULTIPLIER = 1.25;
export const FAVORED_TERRAIN_MULTIPLIER = 1.15;
export const DEFENDER_DAMAGE_MULTIPLIER = 0.85;

// Food score settings
export const NEUTRAL_FOOD_SCORE = 0.5;

// Game speed settings
export const DEFAULT_GAME_SPEED = 2.0;
