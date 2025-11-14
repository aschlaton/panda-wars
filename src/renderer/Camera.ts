import * as PIXI from 'pixi.js';
import { MIN_ZOOM, MAX_ZOOM, TRANSITION_SPEED, TRANSITION_THRESHOLD } from '../constants';

export class Camera {
  private worldContainer: PIXI.Container;
  private zoomLevel: number = MIN_ZOOM;
  private mapWidth: number = 0;
  private mapHeight: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private isTransitioning: boolean = false;
  private isDragging: boolean = false;
  private dragStart = { x: 0, y: 0 };
  private onViewportUpdate?: (x: number, y: number, zoom: number) => void;

  constructor(worldContainer: PIXI.Container) {
    this.worldContainer = worldContainer;
  }

  setMapSize(width: number, height: number): void {
    this.mapWidth = width;
    this.mapHeight = height;
  }

  setViewportUpdateCallback(callback: (x: number, y: number, zoom: number) => void): void {
    this.onViewportUpdate = callback;
  }

  setupZoom(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.isTransitioning = false;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const worldXBefore = (centerX - this.worldContainer.x) / this.zoomLevel;
      const worldYBefore = (centerY - this.worldContainer.y) / this.zoomLevel;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const oldZoom = this.zoomLevel;
      this.zoomLevel *= delta;
      this.zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoomLevel));

      if (this.zoomLevel !== oldZoom) {
        this.worldContainer.scale.set(this.zoomLevel);

        this.worldContainer.x = centerX - worldXBefore * this.zoomLevel;
        this.worldContainer.y = centerY - worldYBefore * this.zoomLevel;

        this.clampPosition();
        this.notifyViewportUpdate();
      }
    });
  }

  setupPan(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.isTransitioning = false;
      this.dragStart = { x: e.clientX - this.worldContainer.x, y: e.clientY - this.worldContainer.y };
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.worldContainer.x = e.clientX - this.dragStart.x;
        this.worldContainer.y = e.clientY - this.dragStart.y;
        this.clampPosition();
        this.notifyViewportUpdate();
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
  }

  transitionTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    this.isTransitioning = true;
  }

  update(ticker: PIXI.Ticker): void {
    if (this.isTransitioning) {
      const speed = TRANSITION_SPEED;
      const scaledWidth = this.mapWidth * this.zoomLevel;
      const scaledHeight = this.mapHeight * this.zoomLevel;
      const clampedTargetX = Math.min(0, Math.max(window.innerWidth - scaledWidth, this.targetX));
      const clampedTargetY = Math.min(0, Math.max(window.innerHeight - scaledHeight, this.targetY));

      const dx = clampedTargetX - this.worldContainer.x;
      const dy = clampedTargetY - this.worldContainer.y;

      if (Math.abs(dx) < TRANSITION_THRESHOLD && Math.abs(dy) < TRANSITION_THRESHOLD) {
        this.worldContainer.x = clampedTargetX;
        this.worldContainer.y = clampedTargetY;
        this.isTransitioning = false;
      } else {
        this.worldContainer.x += dx * speed;
        this.worldContainer.y += dy * speed;
      }

      this.notifyViewportUpdate();
    }
  }

  private clampPosition(): void {
    const scaledWidth = this.mapWidth * this.zoomLevel;
    const scaledHeight = this.mapHeight * this.zoomLevel;
    this.worldContainer.x = Math.min(0, Math.max(window.innerWidth - scaledWidth, this.worldContainer.x));
    this.worldContainer.y = Math.min(0, Math.max(window.innerHeight - scaledHeight, this.worldContainer.y));
  }

  private notifyViewportUpdate(): void {
    if (this.onViewportUpdate) {
      this.onViewportUpdate(this.worldContainer.x, this.worldContainer.y, this.zoomLevel);
    }
  }

  getZoom(): number {
    return this.zoomLevel;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.worldContainer.x, y: this.worldContainer.y };
  }

  reset(): void {
    this.zoomLevel = MIN_ZOOM;
    this.worldContainer.scale.set(this.zoomLevel);
    this.worldContainer.x = 0;
    this.worldContainer.y = 0;
    this.isTransitioning = false;
  }
}

