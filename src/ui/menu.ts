export function createMenu(container: HTMLElement): {
  addMenuItem: (text: string, onClick: () => void) => void;
} {
  // Hamburger button
  const menuToggle = document.createElement('button');
  menuToggle.id = 'menu-toggle';
  menuToggle.innerHTML = '<span></span><span></span><span></span>';
  container.appendChild(menuToggle);

  // Side menu
  const sideMenu = document.createElement('div');
  sideMenu.id = 'side-menu';
  container.appendChild(sideMenu);

  // Toggle menu
  menuToggle.addEventListener('click', () => {
    sideMenu.classList.toggle('open');
  });

  // Close menu when clicking outside
  container.addEventListener('click', (e) => {
    if (!sideMenu.contains(e.target as Node) && !menuToggle.contains(e.target as Node)) {
      sideMenu.classList.remove('open');
    }
  });

  return {
    addMenuItem: (text: string, onClick: () => void) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.addEventListener('click', () => {
        onClick();
        sideMenu.classList.remove('open'); // Close menu after click
      });
      sideMenu.appendChild(button);
    },
  };
}
