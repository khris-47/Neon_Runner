/**
 * Obstacle
 *
 * Representa un obstaculo reutilizable del pool. La malla visual es
 * un clon del template (un Group con el modelo dentro). La caja de
 * colision sigue siendo un AABB derivado de la configuracion del
 * tipo.
 *
 * Incluye una "sombra de contacto": un disco oscuro semitransparente
 * justo debajo, en el nivel del track. Es una tecnica estandar para
 * anclar visualmente el modelo al suelo, especialmente util con
 * modelos cuya masa visual esta arriba.
 */

import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig.js';

export class Obstacle {
  /**
   * @param {string} typeName
   * @param {THREE.Object3D} template Group con el modelo dentro
   * @param {object} typeConfig
   */
  constructor(typeName, template, typeConfig) {
    this.typeName = typeName;
    this.typeConfig = typeConfig;
    this.variantIndex = 0;

    // mesh es el wrapper del template. Su posicion se controla desde
    // place() y advance(); el modelo interior conserva su offset.
    this.mesh = template.clone();
    this.mesh.visible = false;

    // Sombra de contacto. Se posiciona a -yOffset respecto al centro
    // del wrapper, lo que la deja en y = 0 en el mundo (el nivel del
    // track) cuando el wrapper esta en y = yOffset.
    const shadowGeo = new THREE.CircleGeometry(1.0, 24);
    const shadowMat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x000000) },
        opacity: { value: 0.5 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          vec2 c = vUv - vec2(0.5);
          float d = length(c) * 2.0;
          float a = smoothstep(1.0, 0.2, d) * opacity;
          gl_FragColor = vec4(color, a);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = -typeConfig.yOffset + 0.02;

    const shadowRadius = Math.max(typeConfig.size.x, typeConfig.size.z) * 0.6;
    this.shadow.scale.setScalar(shadowRadius);

    this.mesh.add(this.shadow);

    this.box = new THREE.Box3();
    this.lane = -1;
    this.position = new THREE.Vector3();
  }

  place(laneIndex, z) {
    this.lane = laneIndex;
    const laneX = this._laneCenterX(laneIndex);
    const y = this.typeConfig.yOffset;
    this.position.set(laneX, y, z);
    // Movemos el wrapper, no el modelo. El modelo interior conserva
    // su offset de alineacion.
    this.mesh.position.copy(this.position);
    this.mesh.visible = true;
    this._recomputeBox();
  }

  advance(delta) {
    if (!this.mesh.visible) return;
    this.position.z += delta;
    this.mesh.position.z = this.position.z;
    this._recomputeBox();
  }

  hide() {
    this.mesh.visible = false;
    this.lane = -1;
    this.box.makeEmpty();
  }

  _laneCenterX(laneIndex) {
    const { trackWidth, laneCount } = GameConfig.world;
    const laneWidth = trackWidth / laneCount;
    return (laneIndex - (laneCount - 1) / 2) * laneWidth;
  }

  _recomputeBox() {
    const half = this.typeConfig.size;
    this.box.min.set(
      this.position.x - half.x / 2,
      this.position.y - half.y / 2,
      this.position.z - half.z / 2
    );
    this.box.max.set(
      this.position.x + half.x / 2,
      this.position.y + half.y / 2,
      this.position.z + half.z / 2
    );
  }
}