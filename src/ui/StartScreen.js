/**
 * StartScreen
 *
 * Pantalla inicial del juego. Se muestra en estado MENU y se oculta
 * al empezar a jugar.
 *
 * Responsividad:
 *   El titulo usa clamp() para escalar entre un minimo y un maximo
 *   segun el ancho del viewport. Asi el texto no se rompe en dos
 *   lineas en movil ni se ve ridiculamente grande en desktop.
 *
 *   El texto de ayuda se adapta al tipo de dispositivo: en pantallas
 *   tactiles muestra instrucciones de swipe/tap, en desktop muestra
 *   las teclas.
 *
 * Se construye con DOM y estilos inline para no depender de hojas
 * de estilo externas ni de un sistema de UI.
 */

import { fontStack } from './Fonts.js';

export class StartScreen {
  /**
   * @param {HTMLElement} container
   * @param {() => void} onStart callback al pulsar empezar
   */
  constructor(container, onStart) {
    this.container = container;
    this.onStart = onStart;

    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: clamp(16px, 3vh, 28px);
      padding: 24px;
      box-sizing: border-box;
      background: rgba(10, 10, 31, 0.85);
      backdrop-filter: blur(4px);
      font-family: ${fontStack()};
      color: #e0e0ff;
      z-index: 10;
      user-select: none;
      text-align: center;
    `;

    const title = document.createElement('h1');
    title.textContent = 'NEON RUNNER';
    // Fuente fluida: minimo 26px, maximo 48px, escalando con el
    // ancho del viewport. El letter-spacing tambien se adapta.
    // white-space: nowrap evita que se parta en dos lineas.
    title.style.cssText = `
      font-size: clamp(26px, 9vw, 48px);
      letter-spacing: clamp(2px, 1.2vw, 6px);
      color: #00e5ff;
      text-shadow: 0 0 20px #00e5ffaa, 0 0 40px #ff00aa55;
      margin: 0;
      white-space: nowrap;
      line-height: 1.1;
    `;

    const hint = document.createElement('p');
    hint.textContent = this._getHintText();
    hint.style.cssText = `
      opacity: 0.75;
      margin: 0;
      font-size: clamp(11px, 3vw, 14px);
      max-width: 90%;
      line-height: 1.5;
      color: #a0a0d0;
    `;

    const button = document.createElement('button');
    button.textContent = 'EMPEZAR';
    button.style.cssText = `
      padding: clamp(10px, 2.5vh, 14px) clamp(24px, 8vw, 32px);
      font-size: clamp(14px, 3.5vw, 18px);
      font-family: inherit;
      letter-spacing: clamp(2px, 0.8vw, 3px);
      background: transparent;
      color: #00e5ff;
      border: 2px solid #00e5ff;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-shadow: 0 0 8px #00e5ff88;
      touch-action: manipulation;
    `;
    button.addEventListener('mouseenter', () => {
      button.style.background = '#00e5ff22';
      button.style.boxShadow = '0 0 24px #00e5ff66';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'transparent';
      button.style.boxShadow = 'none';
    });
    // touchstart con preventDefault para evitar el doble disparo
    // click+touch en algunos navegadores.
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onStart();
    }, { passive: false });
    button.addEventListener('click', (e) => {
      // Si venimos de un touchstart, evitamos el click duplicado.
      if (e.detail === 0) return;
      this.onStart();
    });

    this.root.appendChild(title);
    this.root.appendChild(hint);
    this.root.appendChild(button);
    container.appendChild(this.root);

    this._onKey = this._onKey.bind(this);
  }

  /**
   * Devuelve el texto de ayuda segun el tipo de dispositivo.
   * matchMedia('(pointer: coarse)') es true en pantallas tactiles.
   */
  _getHintText() {
    if (typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(pointer: coarse)').matches) {
      return 'Desliza para cambiar de carril. Toca o desliza hacia arriba para saltar.';
    }
    return 'A / D o flechas para moverte. W o Espacio para saltar.';
  }

  show() {
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
      this.onStart();
    }
  }

  dispose() {
    window.removeEventListener('keydown', this._onKey);
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }
}