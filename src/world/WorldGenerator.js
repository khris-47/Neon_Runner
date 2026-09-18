/**
 * WorldGenerator
 *
 * Mantiene una cantidad suficiente de segmentos de pista delante del
 * jugador y recicla los que quedan demasiado atras.
 *
 * Modelo de movimiento (importante para leer el resto del modulo):
 *   - La camara mira hacia -Z, por lo que el "frente" del juego es -Z.
 *     Cuanto mas negativo es un Z, mas adelante esta.
 *   - El jugador esta fijo en Z=0.
 *   - El mundo se desplaza hacia +Z: los segmentos situados delante
 *     (-Z) se acercan al jugador, lo cruzan, y salen por detras (+Z).
 *   - Cuando un segmento supera el limite trasero, se recicla
 *     colocandolo en la posicion mas adelantada del pool.
 *
 * El generador no conoce al ObstacleGenerator. En su lugar, acumula
 * los segmentos reciclados en un buffer que el orquestador (Game)
 * consume cada frame para poblar los nuevos segmentos con
 * obstaculos. Esto mantiene la separacion de responsabilidades.
 */

import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig.js';
import { TrackSegment } from './TrackSegment.js';

export class WorldGenerator {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    this.segmentLength = GameConfig.world.segmentLength;

    const poolSize =
      GameConfig.world.segmentsAhead + GameConfig.world.segmentsBehind + 1;

    this.segments = [];
    for (let i = 0; i < poolSize; i++) {
      const seg = new TrackSegment(i);
      this.scene.add(seg.group);
      this.segments.push(seg);
    }

    this.distanceTravelled = 0;

    // Buffer de segmentos reciclados en el frame actual. Game lo
    // consume cada frame para poblar obstaculos.
    this._recycledThisFrame = [];

    this._resetPool();
  }

  /**
   * Avanza el mundo hacia el jugador la cantidad indicada.
   * Mueve todos los segmentos en +Z y recicla los que quedan por
   * detras del limite trasero.
   *
   * @param {number} distance unidades a avanzar este frame (positivo)
   */
  advance(distance) {
    if (distance <= 0) return;

    this.distanceTravelled += distance;

    for (const seg of this.segments) {
      if (seg.group.visible) {
        seg.group.position.z += distance;
      }
    }

    const recycleThreshold =
      this.segmentLength * (GameConfig.world.segmentsBehind + 0.5);

    for (const seg of this.segments) {
      if (!seg.group.visible) continue;
      if (seg.group.position.z > recycleThreshold) {
        this._placeAtFront(seg);
        this._recycledThisFrame.push(seg);
      }
    }
  }

  /**
   * Devuelve los segmentos reciclados en el frame actual y limpia el
   * buffer. Game debe llamarlo una vez por frame despues de advance().
   *
   * @returns {Array<TrackSegment>}
   */
  consumeRecycledSegments() {
    const out = this._recycledThisFrame;
    this._recycledThisFrame = [];
    return out;
  }

  /**
   * Coloca un segmento en la parte mas adelantada del mundo generado.
   */
  _placeAtFront(seg) {
    let minZ = Infinity;
    for (const s of this.segments) {
      if (s === seg) continue;
      if (s.group.visible && s.group.position.z < minZ) {
        minZ = s.group.position.z;
      }
    }
    const z = minZ === Infinity
      ? -this.segmentLength
      : minZ - this.segmentLength;
    seg.setPosition(z);
  }

  reset() {
    this.distanceTravelled = 0;
    this._recycledThisFrame = [];
    this._resetPool();
  }

  /**
   * Distribuye los segmentos del pool por delante del jugador.
   */
  _resetPool() {
    const total = this.segments.length;
    const behind = GameConfig.world.segmentsBehind;
    const startZ = this.segmentLength * (behind + 0.5);

    for (let i = 0; i < total; i++) {
      const seg = this.segments[i];
      seg.setPosition(startZ - i * this.segmentLength);
    }
  }

  getDistance() {
    return this.distanceTravelled;
  }
}