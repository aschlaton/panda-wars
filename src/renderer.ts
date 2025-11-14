import * as PIXI from 'pixi.js';
import type { GameState } from './types';
import { TERRAIN_INFO } from './world/terrain';
import { Minimap } from './ui/Minimap';
import { TilePopup } from './ui/TilePopup';
import { Camera } from './renderer/Camera';
import { BuildingRenderer } from './renderer/BuildingRenderer';
import { ArmyRenderer } from './renderer/ArmyRenderer';
import { drawHexagon, screenToHexCoords, hexToPixel } from './utils/hexUtils';
import {
  MAP_SCALE_MULTIPLIER,
  HEX_BORDER_WIDTH,
  HEX_BORDER_COLOR,
} from './constants';

export class Renderer {
  public app: PIXI.Application;
  private worldContainer: PIXI.Container;
  private terrainContainer: PIXI.Container;
  private dynamicContainer: PIXI.Container;
  private mapWidth: number = 0;
  private mapHeight: number = 0;
  private minimap: Minimap;
  private camera: Camera;
  private hexRadius: number = 0;
  private hexWidth: number = 0;
  private terrainRendered: boolean = false;
  private currentState: GameState | null = null;
  private highlightGraphics: PIXI.Graphics | null = null;
  private hoveredTile: { col: number; row: number } | null = null;
  private unitTextures: Map<string, PIXI.Texture> = new Map();
  private tilePopup: TilePopup;
  private buildingRenderer: BuildingRenderer | null = null;
  private armyRenderer: ArmyRenderer | null = null;

  constructor() {
    this.app = new PIXI.Application();
    this.worldContainer = new PIXI.Container();
    this.terrainContainer = new PIXI.Container();
    this.dynamicContainer = new PIXI.Container();
    this.highlightGraphics = new PIXI.Graphics();
    this.worldContainer.addChild(this.terrainContainer);
    this.worldContainer.addChild(this.dynamicContainer);
    this.worldContainer.addChild(this.highlightGraphics);
    this.minimap = new Minimap();
    this.tilePopup = new TilePopup();
    this.camera = new Camera(this.worldContainer);
  }

  async init(container: HTMLElement): Promise<void> {
    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x2c3e50,
      resizeTo: window,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      preference: 'webgl',
      premultipliedAlpha: true,
    });

    // Prevent ticker from stopping when window loses focus
    this.app.ticker.autoStart = true;
    this.app.ticker.stop = () => {}; // Override stop to prevent pausing

    this.app.canvas.id = 'game-container';
    container.appendChild(this.app.canvas);
    this.app.stage.addChild(this.worldContainer);

    // Load unit textures
    await this.loadUnitTextures();

    // Handle window resize
    window.addEventListener('resize', () => {
      this.onResize();
    });

    // Handle clicks on the canvas to show tile info
    this.app.canvas.addEventListener('click', (e) => {
      this.onCanvasClick(e);
    });

    // Handle mouse move for hover highlight
    this.app.canvas.addEventListener('mousemove', (e) => {
      this.onCanvasHover(e);
    });

    // Prevent browser zoom
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=')) {
        e.preventDefault();
      }
    });

    document.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    }, { passive: false });

    this.camera.setViewportUpdateCallback((x, y, zoom) => {
      this.minimap.updateViewport(x, y, zoom, this.mapWidth, this.mapHeight);
    });

    this.camera.setupZoom(this.app.canvas);
    this.camera.setupPan(this.app.canvas);

    await this.minimap.init(container);
    this.minimap.onViewportChange((x, y) => {
      this.camera.transitionTo(x, y);
    });

    this.app.ticker.add(() => {
      this.camera.update(this.app.ticker);
    });
  }


  private renderTerrain(state: GameState): void {
    const cols = state.mapWidth;
    const rows = state.mapHeight;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = state.world![row][col];
        const { x, y } = hexToPixel(col, row, this.hexRadius, this.hexWidth);

        const terrain = new PIXI.Graphics();
        const color = TERRAIN_INFO[tile.terrainType].color;
        drawHexagon(terrain, x, y, this.hexRadius);
        terrain.fill(color);
        terrain.stroke({ width: HEX_BORDER_WIDTH, color: HEX_BORDER_COLOR });
        this.terrainContainer.addChild(terrain);
      }
    }
  }

  private renderDynamic(state: GameState): void {
    // Clear graphics objects only (not sprites)
    for (const child of this.dynamicContainer.children) {
      if (child instanceof PIXI.Graphics) {
        child.clear();
      } else if (child instanceof PIXI.Sprite) {
        child.visible = false;
      }
    }

    let graphicsIndex = 0;
    const getGraphics = (): PIXI.Graphics => {
      // Find next Graphics object (skip Sprites)
      while (graphicsIndex < this.dynamicContainer.children.length) {
        const child = this.dynamicContainer.children[graphicsIndex++];
        if (child instanceof PIXI.Graphics) {
          return child;
        }
      }
      const g = new PIXI.Graphics();
      this.dynamicContainer.addChild(g);
      graphicsIndex++;
      return g;
    };

    this.buildingRenderer = new BuildingRenderer(this.hexRadius, this.hexWidth);
    this.armyRenderer = new ArmyRenderer(this.hexRadius, this.hexWidth, this.unitTextures);

    for (const faction of state.factions) {
      for (const buildingData of faction.buildings) {
        const building = getGraphics();
        this.buildingRenderer.render(buildingData, building);
      }
    }

    const pathsGraphics = getGraphics();
    this.armyRenderer.renderPaths(state.armies, pathsGraphics);
    this.armyRenderer.renderSprites(state.armies, this.dynamicContainer, getGraphics);

  }

  private async loadUnitTextures(): Promise<void> {
    const textures = await Promise.all([
      PIXI.Assets.load('/panda-wars/assets/units/panda-monk.png'),
      PIXI.Assets.load('/panda-wars/assets/units/panda-warrior.png'),
      PIXI.Assets.load('/panda-wars/assets/units/panda-archer.png'),
    ]);

    this.unitTextures.set('monk', textures[0]);
    this.unitTextures.set('warrior', textures[1]);
    this.unitTextures.set('archer', textures[2]);
  }

  render(state: GameState): void {
    if (!state.world) return;

    // Store current state for click handling
    this.currentState = state;

    if (!this.terrainRendered) {
      this.worldContainer.scale.set(this.camera.getZoom());

      const cols = state.mapWidth;
      const rows = state.mapHeight;

      const widthNeeded = cols * Math.sqrt(3) + 0.5 * Math.sqrt(3);
      const heightNeeded = rows * 1.5 + 0.5;

      const hexRadiusForWidth = window.innerWidth / widthNeeded;
      const hexRadiusForHeight = window.innerHeight / heightNeeded;

      this.hexRadius = Math.max(hexRadiusForWidth, hexRadiusForHeight) * MAP_SCALE_MULTIPLIER;
      this.hexWidth = Math.sqrt(3) * this.hexRadius;

      this.mapWidth = cols * this.hexWidth + this.hexWidth / 2;
      this.mapHeight = rows * this.hexRadius * 1.5 + this.hexRadius * 0.5;

      this.camera.setMapSize(this.mapWidth, this.mapHeight);

      this.renderTerrain(state);
      this.terrainRendered = true;

      this.minimap.resize(this.mapWidth, this.mapHeight);
      this.minimap.render(state.world, this.hexRadius, this.hexWidth, cols, rows);
      const pos = this.camera.getPosition();
      this.minimap.updateViewport(pos.x, pos.y, this.camera.getZoom(), this.mapWidth, this.mapHeight);
    }

    // Render dynamic content every frame
    this.renderDynamic(state);
  }

  public refreshMinimap(state: GameState): void {
    if (!state.world) return;
    if (this.hexRadius <= 0 || this.hexWidth <= 0) return;
    this.minimap.render(state.world, this.hexRadius, this.hexWidth, state.mapWidth, state.mapHeight);
    const pos = this.camera.getPosition();
    this.minimap.updateViewport(pos.x, pos.y, this.camera.getZoom(), this.mapWidth, this.mapHeight);
  }

  public resetForNewWorld(): void {
    this.terrainContainer.removeChildren();
    this.dynamicContainer.removeChildren();

    this.terrainRendered = false;
    this.hexRadius = 0;
    this.hexWidth = 0;
    this.mapWidth = 0;
    this.mapHeight = 0;

    this.camera.reset();
  }

  private onResize(): void {
    const pos = this.camera.getPosition();
    this.minimap.updateViewport(pos.x, pos.y, this.camera.getZoom(), this.mapWidth, this.mapHeight);
  }

  private screenToHexCoords(screenX: number, screenY: number): { col: number; row: number } | null {
    if (!this.currentState || !this.currentState.world) return null;

    const pos = this.camera.getPosition();
    return screenToHexCoords(
      screenX,
      screenY,
      pos.x,
      pos.y,
      this.camera.getZoom(),
      this.hexRadius,
      this.hexWidth,
      this.currentState.mapWidth,
      this.currentState.mapHeight
    );
  }

  private onCanvasHover(e: MouseEvent): void {
    const coords = this.screenToHexCoords(e.clientX, e.clientY);

    if (!coords) {
      // Clear highlight
      if (this.hoveredTile) {
        this.hoveredTile = null;
        this.highlightGraphics?.clear();
      }
      return;
    }

    // Check if hovering different tile
    if (!this.hoveredTile || this.hoveredTile.col !== coords.col || this.hoveredTile.row !== coords.row) {
      this.hoveredTile = coords;
      this.drawHighlight(coords.col, coords.row);
    }
  }

  private drawHighlight(col: number, row: number): void {
    if (!this.highlightGraphics) return;

    this.highlightGraphics.clear();

    const { x, y } = hexToPixel(col, row, this.hexRadius, this.hexWidth);

    drawHexagon(this.highlightGraphics, x, y, this.hexRadius);
    this.highlightGraphics.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.5 });
  }


  private onCanvasClick(e: MouseEvent): void {
    const coords = this.screenToHexCoords(e.clientX, e.clientY);
    if (!coords || !this.currentState?.world) return;

    const { col, row } = coords;
    const tile = this.currentState.world[row][col];
    const army = this.currentState.armies.find(a => a.position.x === col && a.position.y === row);

    this.tilePopup.show(col, row, tile, army, e);
  }
}
