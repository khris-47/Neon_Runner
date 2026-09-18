/**
 * Lighting
 *
 * Crea y agrega las luces de la escena.
 *
 * Iluminacion actual:
 *   - AmbientLight con tinte violeta para rellenar sin aplanar.
 *   - DirectionalLight frontal-superior con sombras activadas. Es la
 *     unica luz que proyecta sombras: tener solo una fuente de sombra
 *     mantiene el shadow map pequeno y el coste bajo.
 *   - DirectionalLight de relleno desde atras con color cian, sin
 *     sombras, para despegar al jugador y los bordes del fondo.
 */

import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig.js';

export class Lighting {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    this.ambient = new THREE.AmbientLight(GameConfig.palette.ambient, 1.1);
    scene.add(this.ambient);

    this.directional = new THREE.DirectionalLight(
      GameConfig.palette.directional,
      1.0
    );
    this.directional.position.set(6, 12, 4);
    this.directional.castShadow = true;

    // La sombra cubre solo la zona donde esta el jugador. Un shadow
    // map pequeno es mucho mas rapido y visualmente no notamos la
    // diferencia porque el jugador solo proyecta sombra sobre la
    // pista inmediata.
    this.directional.shadow.mapSize.set(1024, 1024);
    this.directional.shadow.camera.left = -12;
    this.directional.shadow.camera.right = 12;
    this.directional.shadow.camera.top = 12;
    this.directional.shadow.camera.bottom = -12;
    this.directional.shadow.camera.near = 1;
    this.directional.shadow.camera.far = 40;
    this.directional.shadow.bias = -0.0005;
    scene.add(this.directional);

    this.backFill = new THREE.DirectionalLight(
      GameConfig.palette.trackEdge,
      0.5
    );
    this.backFill.position.set(-4, 6, -8);
    scene.add(this.backFill);
  }
}