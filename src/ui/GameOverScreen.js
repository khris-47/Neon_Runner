/**
 * GameOverScreen
 *
 * Pantalla de fin de partida. Muestra puntuacion final, mejor
 * puntuacion y distancia recorrida, y permite reiniciar.
 *
 * Se construye una vez y se muestra/oculta segun el estado del juego.
 * Los valores se actualizan al mostrarla, no por frame.
 */

export class GameOverScreen {
  /**
   * @param {HTMLElement} container
   * @param {() => void} onRestart callback al pulsar reiniciar
   */
  constructor(container, onRestart) {
    this.container = container;
    this.onRestart = onRestart;

    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: absolute;
      inset: 0;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      background: rgba(10, 10, 31, 0.88);
      backdrop-filter: blur(4px);
      font-family: ui-monospace, monospace;
      color: #e0e0ff;
      z-index: 10;
      user-select: none;
    `;

    const title = document.createElement('h1');
    title.textContent = 'GAME OVER';
    title.style.cssText = `
      font-size: 42px;
      letter-spacing: 6px;
      color: #ff00aa;
      text-shadow: 0 0 20px #ff00aaaa;
      margin: 0;
    `;

    this.statsEl = document.createElement('div');
    this.statsEl.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 18px;
      text-align: center;
    `;

    this.recordEl = document.createElement('div');
    this.recordEl.style.cssText = `
      font-size: 16px;
      color: #00e5ff;
      text-shadow: 0 0 12px #00e5ff88;
      letter-spacing: 2px;
      min-height: 22px;
    `;

    const button = document.createElement('button');
    button.textContent = 'REINTENTAR';
    button.style.cssText = `
      padding: 14px 32px;
      font-size: 18px;
      font-family: inherit;
      letter-spacing: 3px;
      background: transparent;
      color: #ff00aa;
      border: 2px solid #ff00aa;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-shadow: 0 0 8px #ff00aa88;
      margin-top: 8px;
    `;
    button.addEventListener('mouseenter', () => {
      button.style.background = '#ff00aa22';
      button.style.boxShadow = '0 0 24px #ff00aa66';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'transparent';
      button.style.boxShadow = 'none';
    });
    button.addEventListener('click', () => this.onRestart());

    this.root.appendChild(title);
    this.root.appendChild(this.statsEl);
    this.root.appendChild(this.recordEl);
    this.root.appendChild(button);
    container.appendChild(this.root);

    this._onKey = this._onKey.bind(this);
  }

  /**
   * Muestra la pantalla con los datos de la partida finalizada.
   *
   * @param {number} score
   * @param {number} distance
   * @param {number} best
   * @param {boolean} isRecord
   */
  show(score, distance, best, isRecord) {
    this.statsEl.innerHTML = `
      <div>Puntuacion: <strong style="color:#00e5ff">${score}</strong></div>
      <div>Distancia: <strong style="color:#00e5ff">${Math.floor(distance)} m</strong></div>
      <div>Mejor: <strong style="color:#00e5ff">${best}</strong></div>
    `;
    this.recordEl.textContent = isRecord ? 'NUEVO RECORD' : '';
    this.root.style.display = 'flex';
    window.addEventListener('keydown', this._onKey);
  }

  hide() {
    this.root.style.display = 'none';
    window.removeEventListener('keydown', this._onKey);
  }

  _onKey(e) {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      this.onRestart();
    }
  }

  dispose() {
    window.removeEventListener('keydown', this._onKey);
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }
}