/**
 * HUD
 *
 * Interfaz en pantalla durante la partida. Muestra puntuacion,
 * distancia, nivel de dificultad y un indicador de velocidad. Ofrece
 * un boton de pausa.
 *
 * El HUD solo se actualiza cuando los valores cambian, no cada frame.
 * El flash de nivel se dispara solo cuando el nivel cambia.
 */

export class HUD {
  constructor(container, onPause) {
    this.container = container;
    this.onPause = onPause;

    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      user-select: none;
      font-family: ui-monospace, monospace;
    `;

    this.stats = document.createElement('div');
    this.stats.style.cssText = `
      position: absolute;
      top: 16px;
      left: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 14px;
      color: #c0c0ff;
      text-shadow: 0 0 8px #00e5ff88;
    `;

    this.scoreEl = document.createElement('div');
    this.scoreEl.style.cssText = 'font-size: 28px; font-weight: 700; color: #00e5ff; text-shadow: 0 0 12px #00e5ffaa;';

    this.distanceEl = document.createElement('div');
    this.distanceEl.style.cssText = 'opacity: 0.85;';

    this.levelEl = document.createElement('div');
    this.levelEl.style.cssText = 'opacity: 0.75; color: #ff00aa; text-shadow: 0 0 8px #ff00aa88; transition: transform 0.2s ease;';

    // Barra de velocidad: fondo tenue con un relleno que crece.
    this.speedBarOuter = document.createElement('div');
    this.speedBarOuter.style.cssText = `
      width: 120px;
      height: 4px;
      background: rgba(0, 229, 255, 0.12);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 4px;
    `;
    this.speedBarInner = document.createElement('div');
    this.speedBarInner.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #00e5ff, #ff00aa);
      transition: width 0.2s ease;
    `;
    this.speedBarOuter.appendChild(this.speedBarInner);

    this.stats.appendChild(this.scoreEl);
    this.stats.appendChild(this.distanceEl);
    this.stats.appendChild(this.levelEl);
    this.stats.appendChild(this.speedBarOuter);

    this.pauseBtn = document.createElement('button');
    this.pauseBtn.textContent = 'II';
    this.pauseBtn.setAttribute('aria-label', 'Pausa');
    this.pauseBtn.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      width: 44px;
      height: 44px;
      font-size: 18px;
      font-family: inherit;
      background: rgba(0, 229, 255, 0.08);
      color: #00e5ff;
      border: 2px solid #00e5ff;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-shadow: 0 0 8px #00e5ff88;
      pointer-events: auto;
    `;
    this.pauseBtn.addEventListener('mouseenter', () => {
      this.pauseBtn.style.background = 'rgba(0, 229, 255, 0.2)';
      this.pauseBtn.style.boxShadow = '0 0 20px #00e5ff66';
    });
    this.pauseBtn.addEventListener('mouseleave', () => {
      this.pauseBtn.style.background = 'rgba(0, 229, 255, 0.08)';
      this.pauseBtn.style.boxShadow = 'none';
    });
    this.pauseBtn.addEventListener('click', () => this.onPause());

    this.root.appendChild(this.stats);
    this.root.appendChild(this.pauseBtn);
    container.appendChild(this.root);

    this._lastScore = -1;
    this._lastDistance = -1;
    this._lastLevel = -1;
    this._lastSpeed = -1;

    this.setVisible(false);
  }

  setVisible(visible) {
    this.root.style.display = visible ? 'block' : 'none';
  }

  /**
   * @param {number} score
   * @param {number} distance
   * @param {number} level nivel visible 1..10
   * @param {number} speedRatio velocidad actual normalizada 0..1
   */
  update(score, distance, level, speedRatio) {
    if (score !== this._lastScore) {
      this.scoreEl.textContent = String(score);
      this._lastScore = score;
    }
    const distInt = Math.floor(distance);
    if (distInt !== this._lastDistance) {
      this.distanceEl.textContent = `${distInt} m`;
      this._lastDistance = distInt;
    }
    if (level !== this._lastLevel) {
      this.levelEl.textContent = `Nivel ${level}`;
      // Flash: escala momentanea del texto al subir de nivel.
      this.levelEl.style.transform = 'scale(1.4)';
      setTimeout(() => {
        this.levelEl.style.transform = 'scale(1)';
      }, 180);
      this._lastLevel = level;
    }
    // Redondeo a 1 decimal para no tocar el DOM por variaciones
    // inapreciables.
    const speedRounded = Math.round(speedRatio * 100) / 100;
    if (speedRounded !== this._lastSpeed) {
      this.speedBarInner.style.width = `${speedRounded * 100}%`;
      this._lastSpeed = speedRounded;
    }
  }

  reset() {
    this._lastScore = -1;
    this._lastDistance = -1;
    this._lastLevel = -1;
    this._lastSpeed = -1;
  }

  dispose() {
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }
}