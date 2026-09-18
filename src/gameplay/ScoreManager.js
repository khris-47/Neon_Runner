/**
 * ScoreManager
 *
 * Calcula la puntuacion de la partida actual y persiste la mejor
 * puntuacion en localStorage.
 *
 * Modelo de puntuacion (Fase 2):
 *   score = distancia_recorrida * pointsPerUnit
 *
 * La distancia se obtiene de WorldGenerator, que es la fuente de
 * verdad de cuanto ha avanzado el mundo. El tiempo no se usa por
 * separado porque distancia = velocidad * tiempo, y la velocidad
 * es constante en Fase 2. En Fase 3, cuando la velocidad varie,
 * seguiremos usando distancia porque es lo que el jugador percibe
 * como avance.
 *
 * La persistencia se aisla aqui para que el resto del juego no sepa
 * que existe localStorage. Si localStorage falla (modo privado,
 * cuota), el juego sigue funcionando: solo se pierde la persistencia.
 */

import { GameConfig } from '../config/GameConfig.js';

export class ScoreManager {
  constructor() {
    this.currentScore = 0;
    this.currentDistance = 0;
    this.bestScore = this._loadBest();
  }

  /**
   * Actualiza la puntuacion a partir de la distancia total recorrida.
   * Se llama cada frame durante PLAYING.
   *
   * @param {number} distance distancia total acumulada
   */
  update(distance) {
    this.currentDistance = distance;
    this.currentScore = Math.floor(distance * GameConfig.score.pointsPerUnit);
  }

  /**
   * Cierra la partida actual. Si la puntuacion supera la mejor,
   * actualiza la mejor y la persiste.
   *
   * @returns {boolean} true si se ha establecido un nuevo record
   */
  finalize() {
    if (this.currentScore > this.bestScore) {
      this.bestScore = this.currentScore;
      this._saveBest(this.bestScore);
      return true;
    }
    return false;
  }

  /**
   * Reinicia la puntuacion de la partida actual sin tocar la mejor.
   */
  reset() {
    this.currentScore = 0;
    this.currentDistance = 0;
  }

  _loadBest() {
    try {
      const raw = window.localStorage.getItem(GameConfig.score.storageKey);
      const value = parseInt(raw, 10);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch (e) {
      // localStorage puede lanzar en modo privado o si esta deshabilitado.
      // En ese caso simplemente no persistimos.
      return 0;
    }
  }

  _saveBest(value) {
    try {
      window.localStorage.setItem(
        GameConfig.score.storageKey,
        String(value)
      );
    } catch (e) {
      // Ignoramos errores de escritura: la partida sigue siendo jugable.
    }
  }
}