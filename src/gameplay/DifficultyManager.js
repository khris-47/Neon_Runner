/**
 * DifficultyManager
 *
 * Calcula en tiempo real todos los parametros de dificultad del juego
 * a partir de la distancia recorrida.
 *
 * Idea central: en lugar de tener reglas dispersas del tipo "a los
 * 1000 metros aparece X", exponemos un unico nivel continuo en [0, 1]
 * y el resto del juego interpola sus parametros sobre ese nivel. Esto
 * permite ajustar toda la curva de dificultad cambiando solo
 * GameConfig.difficulty.
 *
 * El nivel se calcula con una curva potencial:
 *
 *   level = min(1, (distance / rampDistance) ^ rampExponent)
 *
 * Con rampExponent < 1 la dificultad sube rapido al principio y se
 * aplana despues. Es la curva clasica de endless runners: el jugador
 * siente progreso inmediato, y las partidas muy largas no se vuelven
 * imposibles.
 *
 * La velocidad de avance se calcula con una curva de dos tramos para
 * que los primeros niveles sean un tutorial implicito y la dificultad
 * real llegue a partir del nivel visible 4.
 *
 * No conoce al jugador, ni a los obstaculos, ni a la puntuacion.
 * Solo devuelve numeros.
 */

import { GameConfig } from '../config/GameConfig.js';
import { lerp, clamp } from '../utils/MathUtils.js';

export class DifficultyManager {
  constructor() {
    this.level = 0;
    this.distance = 0;
  }

  update(distance) {
    this.distance = distance;
    const cfg = GameConfig.difficulty;
    const t = distance / cfg.rampDistance;
    this.level = clamp(Math.pow(t, cfg.rampExponent), 0, 1);
  }

  /**
   * Velocidad de avance efectiva para el nivel actual.
   *
   * Curva de dos tramos:
   *   level <= speedBumpLevel: interpola start -> mid
   *   level >  speedBumpLevel: interpola mid -> end
   *
   * El tramo A es corto y suave (tutorial implicito). El tramo B es
   * largo y agresivo: la velocidad sube mucho mas por unidad de nivel.
   */
  getForwardSpeed() {
    const cfg = GameConfig.difficulty;
    const { start, mid, end } = cfg.forwardSpeed;
    const bump = cfg.speedBumpLevel;

    if (this.level <= bump) {
      // Tramo A: normalizamos level dentro de [0, bump] a [0, 1].
      const t = bump > 0 ? this.level / bump : 1;
      return lerp(start, mid, t);
    }

    // Tramo B: normalizamos level dentro de [bump, 1] a [0, 1].
    const t = (this.level - bump) / (1 - bump);
    return lerp(mid, end, t);
  }

  getSpawnProbability() {
    const { start, end } = GameConfig.difficulty.spawnProbability;
    return lerp(start, end, this.level);
  }

  getMaxBlockedLanes() {
    const { start, end } = GameConfig.difficulty.maxBlockedLanes;
    const laneCount = GameConfig.world.laneCount;
    const raw = Math.round(lerp(start, end, this.level));
    return clamp(raw, 1, laneCount - 1);
  }

  isDenseMode() {
    return this.distance >= GameConfig.difficulty.denseFromDistance;
  }

  getDisplayLevel() {
    return Math.min(10, Math.floor(this.level * 9) + 1);
  }

  reset() {
    this.level = 0;
    this.distance = 0;
  }
}