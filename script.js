let clickCount = 0;
const themes = ['', 'emerald', 'amber'];
let currentThemeIndex = 0;

const btnSaludo = document.getElementById('btn-saludo');
const btnToggleColor = document.getElementById('btn-toggle-color');
const clickDisplay = document.getElementById('click-count');
const title = document.querySelector('.title');

// Efecto interactivo al pulsar el botón de saludo
btnSaludo.addEventListener('click', () => {
  clickCount++;
  clickDisplay.textContent = clickCount;

  // Animación simpática en el título
  title.style.transform = 'scale(1.08)';
  title.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
  
  setTimeout(() => {
    title.style.transform = 'scale(1)';
  }, 200);

  // Mensaje en consola típico de programador
  console.log(`¡Hola mundo disparado! Clic número: ${clickCount}`);
});

// Cambiar paleta de colores/tema dinámicamente
btnToggleColor.addEventListener('click', () => {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  const nextTheme = themes[currentThemeIndex];
  
  if (nextTheme) {
    document.body.setAttribute('data-theme', nextTheme);
  } else {
    document.body.removeAttribute('data-theme');
  }
});
