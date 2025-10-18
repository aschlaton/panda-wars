import { Renderer } from './renderer';
import type { GameState } from './types';
import { generateWorld, generateStartingPositions, generateSettlements } from './world/worldGen';
import { MAP_WIDTH, MAP_HEIGHT, FACTION_COLORS, WORLD_OCTAVES } from './constants';
import { Capital } from './buildings/buildingTypes';
import { Faction } from './faction/Faction';
import { processGameTurn } from './turns/turnSystem';
import { ClaudeRushStrategy } from './strategy/claude_rush';
import { PassStrategy } from './strategy/pass';

export class Game {
  private renderer: Renderer;
  private state: GameState;
  private needsRender: boolean = false;
  private turnTimer: number = 0;
  private turnInterval: number = 60; // Turns every 60 frames (1 second at 60fps)
  private autoPaused: boolean = false;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.state = {
      worldGenerated: false,
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      factions: [],
      world: null,
      armies: [],
    };
  }

  init(): void {
    // Generate initial world
    this.generateWorld();
  }

  start(): void {
    // Render minimap once at start
    this.renderer.refreshMinimap(this.state);

    let frameCount = 0;

    this.renderer.app.ticker.add(() => {
      this.update();
      if (this.needsRender) {
        this.renderer.render(this.state);
        // Refresh minimap if buildings changed hands or every 60 frames
        frameCount++;
        if (this.state.minimapNeedsUpdate || frameCount % 60 === 0) {
          this.renderer.refreshMinimap(this.state);
          this.state.minimapNeedsUpdate = false;
        }
        this.needsRender = false;
      }
    });
  }

  private update(): void {
    if (!this.state.worldGenerated) return;
    if (this.autoPaused) return;

    // Process game turns
    this.turnTimer++;
    if (this.turnTimer >= this.turnInterval) {
      this.turnTimer = 0;
      this.processTurn();
    }
  }

  public togglePause(): void {
    this.autoPaused = !this.autoPaused;
  }

  public isPaused(): boolean {
    return this.autoPaused;
  }

  public nextTurn(): void {
    this.processTurn();
  }

  public setTurnSpeed(framesPerTurn: number): void {
    this.turnInterval = framesPerTurn;
  }

  private processTurn(): void {
    if (!this.state.world) return;

    processGameTurn(this.state);
    this.needsRender = true;
  }

  generateWorld(): void {
    // Reset renderer so terrain is rebuilt for the new world
    this.renderer.resetForNewWorld();

    // Generate world using Perlin noise
    this.state.world = generateWorld(this.state.mapWidth, this.state.mapHeight, WORLD_OCTAVES);

    // Generate starting positions for factions
    const startingPositions = generateStartingPositions(this.state.world, FACTION_COLORS.length);

    // Initialize factions with starting positions and AI strategy (shared strategy instance is fine now)
    const rushStrategy = new ClaudeRushStrategy();
    this.state.factions = FACTION_COLORS.map((color, id) => new Faction(id, color, startingPositions[id], rushStrategy));

    // Create neutral faction (pass strategy = buildings produce but units don't move, fixed 0.5 food score)
    const passStrategy = new PassStrategy();
    const neutralFaction = new Faction(-1, 0x808080, { x: 0, y: 0 }, passStrategy, true);
    this.state.factions.push(neutralFaction);

    // Place capitals at faction starting positions
    for (const faction of this.state.factions) {
      if (faction === neutralFaction) continue; // Skip neutral faction
      const { x, y } = faction.startPosition;
      const capital = new Capital(faction, faction.startPosition);
      this.state.world[y][x].building = capital;
      faction.addBuilding(capital);
    }

    // Generate neutral settlements (6 guaranteed per player faction + ~21 random)
    generateSettlements(this.state.world, startingPositions, 45, neutralFaction);

    // Build global cache of all buildings (set once after world generation)
    this.state.allBuildings = this.state.factions.flatMap(f => Array.from(f.buildings));

    this.state.worldGenerated = true;
    this.needsRender = true;

    this.renderer.refreshMinimap(this.state);
  }

  getState(): GameState {
    return this.state;
  }
}
