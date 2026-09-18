/**
 * CameraController
 *
 * Hace que la camara siga al jugador con un suavizado independiente
 * del framerate. Incluye un efecto de shake que se activa en el
 * momento del impacto y se actualiza de forma independiente al estado
 * del juego, para que se reproduzca correctamente durante GAME_OVER.
 *
 * El orden de llamada importa:
 *   1. update(playerPos, dt)  -> sigue al jugador (damp)
 *   2. updateShake(dt)        -> aplica el offset aleatorio ENCIMA
 *
 * Si se invierte el orden, el damp de update reposiciona la camara y
 * borra el shake.
 */

import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig.js';
import { damp } from '../utils/MathUtils.js';

export class CameraController {
  constructor(camera) {
    this.camera = camera;

    this._desiredPos = new THREE.Vector3();
    this._desiredLook = new THREE.Vector3();
    this._currentLook = new THREE.Vector3();

    this._shakeTime = 0;
    this._shakeDuration = 0;
    this._shakeAmplitude = 0;
  }

  update(playerPos, dt, instant = false) {
    const cfg = GameConfig.camera;

    this._desiredPos.set(
      playerPos.x + cfg.offset.x,
      playerPos.y + cfg.offset.y,
      playerPos.z + cfg.offset.z
    );

    this._desiredLook.set(
      playerPos.x + cfg.lookAt.x,
      playerPos.y + cfg.lookAt.y,
      playerPos.z + cfg.lookAt.z
    );

    if (instant) {
      this.camera.position.copy(this._desiredPos);
      this._currentLook.copy(this._desiredLook);
    } else {
      this.camera.position.x = damp(this.camera.position.x, this._desiredPos.x, cfg.smoothing, dt);
      this.camera.position.y = damp(this.camera.position.y, this._desiredPos.y, cfg.smoothing, dt);
      this.camera.position.z = damp(this.camera.position.z, this._desiredPos.z, cfg.smoothing, dt);

      this._currentLook.x = damp(this._currentLook.x, this._desiredLook.x, cfg.smoothing, dt);
      this._currentLook.y = damp(this._currentLook.y, this._desiredLook.y, cfg.smoothing, dt);
      this._currentLook.z = damp(this._currentLook.z, this._desiredLook.z, cfg.smoothing, dt);
    }

    this.camera.lookAt(this._currentLook);
  }

  /**
   * Actualiza el shake de camara. Se llama cada frame, DESPUES de
   * update(), e independientemente del estado del juego.
   */
  updateShake(dt) {
    if (this._shakeTime <= 0) return;

    this._shakeTime -= dt;
    const t = Math.max(0, this._shakeTime / this._shakeDuration);
    const amp = this._shakeAmplitude * t * t;

    this.camera.position.x += (Math.random() - 0.5) * amp;
    this.camera.position.y += (Math.random() - 0.5) * amp;
    this.camera.position.z += (Math.random() - 0.5) * amp;
  }

  /**
   * Dispara el shake. Se llama en el momento del impacto.
   */
  shake() {
    const cfg = GameConfig.camera.shake;
    this._shakeAmplitude = cfg.amplitude;
    this._shakeDuration = cfg.duration;
    this._shakeTime = cfg.duration;
  }

  /**
   * Detiene el shake inmediatamente. Se usa al reiniciar partida
   * para asegurar que no quede ningun resto activo.
   */
  clearShake() {
    this._shakeTime = 0;
    this._shakeAmplitude = 0;
  }

  snap(playerPos) {
    this.update(playerPos, 0, true);
  }
}