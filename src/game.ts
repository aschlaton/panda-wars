import { Renderer } from './renderer';
import type { GameState } from './types';
import { generateWorld, generateStartingPositions, generateSettlements } from './world/worldGen';
import { MAP_WIDTH, MAP_HEIGHT, FACTION_COLORS, WORLD_OCTAVES } from './constants';
import { Capital } from './buildings/buildingTypes';
import { Faction } from './faction/Faction';

export class Game {
  private renderer: Renderer;
  private state: GameState;
  private needsRender: boolean = false;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.state = {
      worldGenerated: false,
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      factions: [],
      world: null,
    };
  }

  init(): void {
    // Generate initial world
    this.generateWorld();
  }

  start(): void {
    this.renderer.app.ticker.add(() => {
      this.update();
      if (this.needsRender) {
        this.renderer.render(this.state);
        this.needsRender = false;
      }
    });
  }

  private update(): void {
    if (!this.state.worldGenerated) return;
    // TODO: Game simulation logic
  }

  generateWorld(): void {
    // Generate world using Perlin noise
    this.state.world = generateWorld(this.state.mapWidth, this.state.mapHeight, WORLD_OCTAVES);

    // Generate starting positions for factions
    const startingPositions = generateStartingPositions(this.state.world, FACTION_COLORS.length);

    // Initialize player factions with starting positions
    this.state.factions = FACTION_COLORS.map((color, id) => new Faction(id, color, startingPositions[id]));

    // Place capitals at faction starting positions
    for (const faction of this.state.factions) {
      const { x, y } = faction.startPosition;
      this.state.world[y][x].building = new Capital(faction);
    }

    // Generate neutral settlements (6 guaranteed per player faction + ~21 random)
    generateSettlements(this.state.world, startingPositions, 45);

    this.state.worldGenerated = true;
    this.needsRender = true;
  }

  getState(): GameState {
    return this.state;
  }
}
