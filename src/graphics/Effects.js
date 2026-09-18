/**
 * Effects
 *
 * Sistema de particulas. Mantiene un pool unico de particulas
 * reutilizables y expone tres emisores: rastro del jugador, estallido
 * al saltar y explosion al chocar.
 *
 * Decisiones de diseno:
 *   - Un unico pool en lugar de uno por emisor: reduce la fragmentacion
 *     de memoria y simplifica el update (una sola pasada por frame).
 *   - Se usa ShaderMaterial en lugar de PointsMaterial porque
 *     PointsMaterial ignora el atributo `size` por vertice cuando
 *     sizeAttenuation esta activo: todas las particulas se dibujan
 *     con el mismo tamano, y las muertas (size=0) seguian siendo
 *     visibles. El shader custom respeta size y alpha por particula,
 *     y descarta las particulas muertas.
 *   - La posicion de las particulas muertas se mantiene en el buffer
 *     pero con alpha 0. Con blending aditivo, alpha 0 equivale a no
 *     dibujar nada, sin coste de reorganizar el buffer.
 *
 * El sistema no conoce al jugador ni al juego: expone metodos que el
 * orquestador llama en el momento adecuado.
 */

import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig.js';

/**
 * Vertex shader.
 * Atributos por particula:
 *   position (vec3): posicion en coordenadas de mundo
 *   size     (float): tamano base en unidades
 *   color    (vec3): color RGB
 *   alpha    (float): opacidad 0..1
 *
 * El tamano final se calcula proyectando `size` a espacio de pantalla
 * con la distancia a la camara. Esto reproduce sizeAttenuation pero
 * respetando el valor por particula.
 */
const VERTEX_SHADER = `
attribute float size;
attribute float alpha;
attribute vec3 color;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = color;
  vAlpha = alpha;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  // Proyeccion de tamano: cuanto mas lejos, mas pequeno. El factor
  // 300.0 es un ajuste de escala para que un size=1 se vea razonable
  // a la distancia tipica de camara en este juego.
  gl_PointSize = size * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * Fragment shader.
 * Dibuja un punto circular con un degradado radial suave, para que
 * las particulas parezcan brillos y no cuadrados.
 */
const FRAGMENT_SHADER = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Distancia del fragmento al centro del punto, normalizada a [0,1].
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c) * 2.0;

  // Degradado radial: opaco en el centro, transparente en el borde.
  float falloff = smoothstep(1.0, 0.0, d);

  // Descartamos fragmentos fuera del circulo y con alpha nulo.
  float a = falloff * vAlpha;
  if (a < 0.01) discard;

  gl_FragColor = vec4(vColor, a);
}
`;

export class Effects {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    const total =
      GameConfig.effects.trail.poolSize +
      GameConfig.effects.jumpBurst.poolSize +
      GameConfig.effects.impact.poolSize;

    this.maxParticles = total;

    // Buffers de render. Ademas de position, size y color anadimos
    // alpha, que el shader usa para desvanecer y descartar muertas.
    this.positions = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.alphas = new Float32Array(this.maxParticles);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    // Estado logico por particula.
    this.active = new Uint8Array(this.maxParticles);
    this.velocity = new Float32Array(this.maxParticles * 3);
    this.life = new Float32Array(this.maxParticles);
    this.maxLife = new Float32Array(this.maxParticles);
    this.baseSize = new Float32Array(this.maxParticles);

    this.nextIndex = 0;
    this.trailTimer = 0;

    this._tmpColor = new THREE.Color();
  }

  /**
   * Actualiza todas las particulas activas: aplica velocidad, reduce
   * vida, actualiza alpha y tamano, y marca los buffers como sucios.
   *
   * @param {number} dt delta time en segundos
   */
  update(dt) {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.active[i]) continue;

      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // Particula muerta: alpha 0. El shader la descarta con discard
        // porque a < 0.01, asi que no se dibuja. La posicion se queda
        // donde estaba, pero es irrelevante.
        this.active[i] = 0;
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }

      const vi = i * 3;
      this.positions[vi] += this.velocity[vi] * dt;
      this.positions[vi + 1] += this.velocity[vi + 1] * dt;
      this.positions[vi + 2] += this.velocity[vi + 2] * dt;

      // Desvanecimiento cuadratico: se ve mas natural que lineal.
      const t = this.life[i] / this.maxLife[i];
      this.alphas[i] = t * t;
      this.sizes[i] = this.baseSize[i] * (0.5 + 0.5 * t);
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.points.geometry.attributes.alpha.needsUpdate = true;
  }

  emitTrail(playerPos, dt) {
    if (!GameConfig.effects.trail.enabled) return;
    this.trailTimer += dt;
    const interval = GameConfig.effects.trail.spawnInterval;
    if (this.trailTimer < interval) return;
    this.trailTimer -= interval;

    const cfg = GameConfig.effects.trail;
    this._spawn(
      playerPos.x + (Math.random() - 0.5) * 0.3,
      playerPos.y - 0.4,
      playerPos.z + 0.5,
      cfg.velocity.x + (Math.random() - 0.5) * 0.2,
      cfg.velocity.y + (Math.random() - 0.5) * 0.2,
      cfg.velocity.z + (Math.random() - 0.5) * 0.2,
      cfg.lifetime,
      cfg.size,
      cfg.color
    );
  }

  emitJumpBurst(pos) {
    if (!GameConfig.effects.jumpBurst.enabled) return;
    const cfg = GameConfig.effects.jumpBurst;
    for (let i = 0; i < cfg.count; i++) {
      const angle = (i / cfg.count) * Math.PI * 2;
      const speed = cfg.speed * (0.6 + Math.random() * 0.6);
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed * 0.4;
      const vy = speed * 0.6 * Math.random();
      this._spawn(
        pos.x, pos.y, pos.z,
        vx, vy, vz,
        cfg.lifetime,
        cfg.size,
        cfg.color
      );
    }
  }

  emitImpact(pos) {
    if (!GameConfig.effects.impact.enabled) return;
    const cfg = GameConfig.effects.impact;
    for (let i = 0; i < cfg.count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = cfg.speed * (0.4 + Math.random() * 0.8);
      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.abs(Math.cos(phi)) * speed;
      const vz = Math.sin(phi) * Math.sin(theta) * speed;
      this._spawn(
        pos.x, pos.y, pos.z,
        vx, vy, vz,
        cfg.lifetime,
        cfg.size,
        cfg.color
      );
    }
  }

  reset() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.active[i] = 0;
      this.sizes[i] = 0;
      this.alphas[i] = 0;
    }
    this.trailTimer = 0;
    this.points.geometry.attributes.size.needsUpdate = true;
    this.points.geometry.attributes.alpha.needsUpdate = true;
  }

  _spawn(x, y, z, vx, vy, vz, lifetime, size, colorHex) {
    const i = this.nextIndex;
    this.nextIndex = (this.nextIndex + 1) % this.maxParticles;

    const vi = i * 3;
    this.positions[vi] = x;
    this.positions[vi + 1] = y;
    this.positions[vi + 2] = z;
    this.velocity[vi] = vx;
    this.velocity[vi + 1] = vy;
    this.velocity[vi + 2] = vz;

    this.active[i] = 1;
    this.life[i] = lifetime;
    this.maxLife[i] = lifetime;
    this.baseSize[i] = size;
    this.sizes[i] = size;
    this.alphas[i] = 1;

    this._tmpColor.setHex(colorHex);
    const ci = i * 3;
    this.colors[ci] = this._tmpColor.r;
    this.colors[ci + 1] = this._tmpColor.g;
    this.colors[ci + 2] = this._tmpColor.b;

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
    this.points.geometry.attributes.alpha.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}