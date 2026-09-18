/**
 * Environment
 *
 * Gestiona la iluminacion de entorno basada en HDRI. Cuando el HDRI
 * esta disponible, se aplica como scene.environment para que los
 * materiales PBR reflejen el entorno correctamente. Cuando no lo
 * esta, no se hace nada y la escena mantiene la iluminacion actual.
 *
 * El HDRI no se aplica como scene.background porque el fondo debe
 * seguir siendo el color plano de la paleta para mantener la estetica
 * neon. Solo se usa como fuente de reflexion e iluminacion indirecta.
 */

import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig.js';

export class Environment {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.WebGLRenderer} renderer
   */
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.texture = null;
  }

  /**
   * Aplica un HDRI como environment map de la escena.
   *
   * @param {THREE.DataTexture | null} texture
   */
  applyHDRI(texture) {
    if (!texture) return;
    this.texture = texture;

    // scene.environment se usa para iluminacion indirecta y reflejos.
    // No se cambia scene.background: la estetica mantiene fondo plano.
    this.scene.environment = texture;

    // Ajuste de intensidad de la iluminacion indirecta. El HDRI de
    // Poly Haven nocturno es tenue; con intensity 1.0 se mantiene
    // coherente con la paleta actual sin sobreiluminar.
    this.scene.environmentIntensity = 1.0;
  }

  dispose() {
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
  }
}