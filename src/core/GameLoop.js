/**
 * GameLoop
 *
 * Envuelve requestAnimationFrame y normaliza el delta time.
 *
 * Responsabilidades:
 *   - Ejecutar un callback update(dt) y render(dt) por frame.
 *   - Limitar dt a un maximo para evitar saltos fisicos tras un tab freeze.
 *   - Exponer start/stop para pausar el juego sin destruir la instancia.
 *
 * No conoce el estado del juego ni la logica: solo el timing.
 */

import { GameConfig } from '../config/GameConfig.js';

export class GameLoop {
  /**
   * @param {(dt: number) => void} update callback de actualizacion
   * @param {(dt: number) => void} render callback de render
   */
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.running = false;
    this.lastTime = 0;
    this.rafId = null;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  _tick(now) {
    if (!this.running) return;

    // Delta en segundos. Se acota por arriba para que un freeze del
    // navegador (cambio de pestana, GC largo) no produzca un salto
    // de fisica que teletransporte al jugador o rompa colisiones.
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > GameConfig.loop.maxDelta) dt = GameConfig.loop.maxDelta;
    if (dt < 0) dt = 0;

    this.update(dt);
    this.render(dt);

    this.rafId = requestAnimationFrame(this._tick);
  }
}