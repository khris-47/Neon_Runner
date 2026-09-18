/**
 * PlayerController
 *
 * Puente entre InputManager y Player. Traduce acciones logicas
 * (left, right, jump, laneChange) en llamadas al modelo del jugador.
 *
 * Dos modelos de movimiento lateral coexisten:
 *   - Teclado: continuo. El targetX se desplaza frame a frame
 *     mientras la tecla esta pulsada.
 *   - Touch: discreto. Un swipe establece el targetX al centro del
 *     carril adyacente, alineado con la rejilla de carriles.
 *
 * Se separa de Player para que este ultimo pueda reutilizarse con
 * IA, replays o tests sin depender del input humano.
 */

import { damp, clamp } from '../utils/MathUtils.js';
import { GameConfig } from '../config/GameConfig.js';

export class PlayerController {
  /**
   * @param {import('./Player.js').Player} player
   * @param {import('../core/InputManager.js').InputManager} input
   */
  constructor(player, input) {
    this.player = player;
    this.input = input;

    // Posicion objetivo lateral. En teclado se modifica frame a
    // frame; en touch se ajusta al centro de carril tras cada swipe.
    this.targetX = 0;

    // Ancho de carril. Se usa para alinear el targetX a la rejilla
    // de carriles cuando se recibe un cambio discreto.
    this.laneWidth =
      GameConfig.world.trackWidth / GameConfig.world.laneCount;
  }

  update(dt) {
    // Saltos: edge-trigger. Se consume una sola vez por pulsacion
    // de tecla, swipe vertical o tap.
    if (this.input.consumeJump()) {
      this.player.tryJump();
    }

    // Cambio de carril por touch. Devuelve -1, 0 o 1.
    // Redondeamos la posicion actual al carril mas cercano y
    // aplicamos el delta, con el resultado acotado al rango [-1, 1].
    const laneDelta = this.input.consumeLaneChange();
    if (laneDelta !== 0) {
      const currentLane = Math.round(this.targetX / this.laneWidth);
      const newLane = clamp(currentLane + laneDelta, -1, 1);
      this.targetX = newLane * this.laneWidth;
    }

    // Movimiento lateral por teclado: continuo.
    const left = this.input.isDown('left');
    const right = this.input.isDown('right');

    let direction = 0;
    if (left && !right) direction = -1;
    else if (right && !left) direction = 1;

    if (direction !== 0) {
      const speed = GameConfig.player.lateralSpeed;
      this.targetX += direction * speed * dt;
      this.targetX = clamp(
        this.targetX,
        -this.player.lateralLimit,
        this.player.lateralLimit
      );
    }

    // Suavizado del jugador hacia targetX.
    this.player.position.x = damp(
      this.player.position.x,
      this.targetX,
      GameConfig.player.lateralSmoothing,
      dt
    );

    // Fisica vertical y sincronizacion de malla.
    this.player.update(dt);
  }

  reset() {
    this.targetX = 0;
    this.player.reset();
  }
}