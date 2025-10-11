import { Renderer } from './renderer';
import type { GameState } from './types';
import { generateWorld } from './world/worldGen';
import { MAP_WIDTH, MAP_HEIGHT, PLAYER_COLORS, WORLD_OCTAVES } from './constants';

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

    // Initialize players
    this.state.players = PLAYER_COLORS.map((color, id) => ({ id, color }));

    this.state.worldGenerated = true;
    this.needsRender = true;
  }

  getState(): GameState {
    return this.state;
  }
}
