import './styles/main.css';
import { Renderer } from './renderer';
import { Game } from './game';
import { createMenu } from './ui/menu';

async function init() {
  const appContainer = document.querySelector<HTMLDivElement>('#app')!;
  appContainer.innerHTML = '';

  // Initialize renderer
  const renderer = new Renderer();
  await renderer.init(appContainer);

  // Initialize game
  const game = new Game(renderer);

  // Create hamburger menu
  const menu = createMenu(appContainer);
  menu.addMenuItem('Generate World', () => game.generateWorld());

  // Initialize game state (generates world)
  game.init();

  // Start game loop
  game.start();
}

init();
