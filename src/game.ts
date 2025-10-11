import { Renderer } from './renderer';
import type { GameState } from './types';
import { generateWorld, generateStartingPositions, generateSettlements } from './world/worldGen';
import { MAP_WIDTH, MAP_HEIGHT, FACTION_COLORS, WORLD_OCTAVES } from './constants';
import { Capital } from './buildings/buildingTypes';
import { Faction } from './faction/Faction';
import { processGameTurn } from './turns/turnSystem';

export class Game {
  private renderer: Renderer;
  private state: GameState;
  private needsRender: boolean = false;
  private turnTimer: number = 0;
  private readonly TURN_INTERVAL: number = 60; // Turns every 60 frames (1 second at 60fps)

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

    // Process game turns
    this.turnTimer++;
    if (this.turnTimer >= this.TURN_INTERVAL) {
      this.turnTimer = 0;
      this.processTurn();
    }
  }

  private processTurn(): void {
    if (!this.state.world) return;

    processGameTurn(this.state.factions, this.state.world);
    this.needsRender = true;
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
      const capital = new Capital(faction, faction.startPosition);
      this.state.world[y][x].building = capital;
      faction.addBuilding(capital);
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
