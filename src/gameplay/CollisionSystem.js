/**
 * CollisionSystem
 *
 * Detecta colisiones entre el jugador y los obstaculos activos.
 *
 * Estrategia:
 *   - El jugador se representa como un AABB en coordenadas de mundo,
 *     recalculado cada frame a partir de su posicion.
 *   - Cada obstaculo mantiene su propio AABB ya actualizado (ver
 *     Obstacle._recomputeBox).
 *   - La comprobacion es una interseccion AABB-AABB, que es O(1) por
 *     obstaculo y muy barata.
 *
 * No conoce la puntuacion ni el estado del juego. Solo dice si hay
 * colision y contra que obstaculo.
 */

import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig.js';

export class CollisionSystem {
  constructor() {
    // AABB del jugador, reutilizado por frame.
    this._playerBox = new THREE.Box3();
  }

  /**
   * Comprueba si el jugador colisiona con alguno de los obstaculos
   * activos. Devuelve el obstaculo colisionado o null.
   *
   * @param {import('../player/Player.js').Player} player
   * @param {Array<import('../world/Obstacle.js').Obstacle>} obstacles
   * @returns {import('../world/Obstacle.js').Obstacle | null}
   */
  check(player, obstacles) {
    this._updatePlayerBox(player);

    for (const obs of obstacles) {
      if (this._playerBox.intersectsBox(obs.box)) {
        return obs;
      }
    }
    return null;
  }

  /**
   * Recalcula el AABB del jugador a partir de su posicion y tamano.
   *
   * Se aplica un pequeno margen de perdon (shrink) al AABB del jugador
   * para que roces visuales no cuenten como colision. Esto mejora la
   * sensacion de justicia sin permitir atravesar obstaculos.
   */
  _updatePlayerBox(player) {
    const size = GameConfig.player.size;
    // Margen de perdon: 10% del tamano en cada eje.
    const forgiveness = 0.9;
    const halfX = (size.x * forgiveness) / 2;
    const halfY = (size.y * forgiveness) / 2;
    const halfZ = (size.z * forgiveness) / 2;
    const p = player.position;
    this._playerBox.min.set(p.x - halfX, p.y - halfY, p.z - halfZ);
    this._playerBox.max.set(p.x + halfX, p.y + halfY, p.z + halfZ);
  }
}