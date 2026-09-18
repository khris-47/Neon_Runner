/**
 * PauseScreen
 *
 * Overlay de pausa. Se muestra cuando el juego esta en PAUSED.
 * Ofrece dos acciones: reanudar y reiniciar.
 *
 * Se construye una vez y se muestra/oculta segun el estado. No
 * actualiza valores por frame: la pausa no tiene datos dinamicos.
 */

export class PauseScreen {
  /**
   * @param {HTMLElement} container
   * @param {() => void} onResume
   * @param {() => void} onRestart
   */
  constructor(container, onResume, onRestart) {
    this.container = container;
    this.onResume = onResume;
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
      background: rgba(10, 10, 31, 0.7);
      backdrop-filter: blur(3px);
      font-family: ui-monospace, monospace;
      color: #e0e0ff;
      z-index: 9;
      user-select: none;
    `;

    const title = document.createElement('h1');
    title.textContent = 'PAUSA';
    title.style.cssText = `
      font-size: 36px;
      letter-spacing: 8px;
      color: #00e5ff;
      text-shadow: 0 0 20px #00e5ffaa;
      margin: 0;
    `;

    const resumeBtn = this._makeButton('REANUDAR', '#00e5ff', () => this.onResume());
    const restartBtn = this._makeButton('REINICIAR', '#ff00aa', () => this.onRestart());

    this.root.appendChild(title);
    this.root.appendChild(resumeBtn);
    this.root.appendChild(restartBtn);
    container.appendChild(this.root);
  }

  _makeButton(label, color, onClick) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      padding: 12px 28px;
      font-size: 16px;
      font-family: inherit;
      letter-spacing: 3px;
      background: transparent;
      color: ${color};
      border: 2px solid ${color};
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-shadow: 0 0 8px ${color}88;
      min-width: 200px;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = `${color}22`;
      btn.style.boxShadow = `0 0 24px ${color}66`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.boxShadow = 'none';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  show() {
    this.root.style.display = 'flex';
  }

  hide() {
    this.root.style.display = 'none';
  }

  dispose() {
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }
}