import { Renderer } from './renderer';
import type { GameState } from './types';
import { generateWorld, generateStartingPositions, generateSettlements } from './world/worldGen';
import { MAP_WIDTH, MAP_HEIGHT, PLAYER_COLORS, WORLD_OCTAVES } from './constants';
import { Capital } from './buildings/buildingTypes';

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
      players: [],
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

    // Generate starting positions for players
    const startingPositions = generateStartingPositions(this.state.world, PLAYER_COLORS.length);

    // Initialize players with starting positions
    this.state.players = PLAYER_COLORS.map((color, id) => ({
      id,
      color,
      startPosition: startingPositions[id],
    }));

    // Place capitals at player starting positions
    for (const player of this.state.players) {
      const { x, y } = player.startPosition;
      this.state.world[y][x].building = new Capital(player.id);
    }

    // Generate neutral settlements (6 guaranteed per player + ~21 random)
    generateSettlements(this.state.world, startingPositions, 45);

    this.state.worldGenerated = true;
    this.needsRender = true;
  }

  getState(): GameState {
    return this.state;
  }
}
