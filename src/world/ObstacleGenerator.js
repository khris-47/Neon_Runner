/**
 * ObstacleGenerator
 *
 * Decide, para cada segmento, que obstaculos colocar.
 *
 * Modelo:
 *   - Cada tipo (block, barrier, pillar) tiene N variantes de modelo,
 *     descubiertas dinamicamente por ModelRegistry.
 *   - Cada variante tiene su propio template preparado (un Group con
 *     el modelo ya escalado, centrado y con offset vertical aplicado).
 *   - Los patrones definen cuantos carriles ocupar y de que tipos.
 *   - Al colocar un obstaculo se elige una variante al azar.
 *
 * Sobre el wrapper Group:
 *   El template es un Group que contiene al modelo como hijo. El
 *   Group se posiciona en el mundo con place() y advance(); el modelo
 *   interior conserva su offset de alineacion con el suelo. Sin este
 *   wrapper, mover el mesh sobreescribiria el offset del modelo y el
 *   ySink, el centrado en X/Z y la alineacion con la base se
 *   perderia en cada colocacion.
 *
 * Regla dura: si un patron ocupa los 3 carriles, todos sus tipos
 * deben ser saltables.
 */

import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig.js';
import { Obstacle } from './Obstacle.js';
import { randomInt } from '../utils/MathUtils.js';

const POOL_PER_VARIANT = 4;

export class ObstacleGenerator {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../gameplay/DifficultyManager.js').DifficultyManager} difficulty
   * @param {Object<string, THREE.Object3D[]>} modelsByType
   */
  constructor(scene, difficulty, modelsByType) {
    this.scene = scene;
    this.difficulty = difficulty;

    this.pools = {};
    this.templates = {};

    for (const typeName in GameConfig.obstacles.types) {
      const typeConfig = GameConfig.obstacles.types[typeName];
      const scenes = modelsByType[typeName] || [];

      this.pools[typeName] = [];
      this.templates[typeName] = [];

      for (const gltfScene of scenes) {
        const template = this._prepareTemplate(gltfScene, typeConfig);
        if (!template) continue;

        const vi = this.templates[typeName].length;
        this.templates[typeName].push(template);
        this.pools[typeName].push([]);

        for (let j = 0; j < POOL_PER_VARIANT; j++) {
          const obs = new Obstacle(typeName, template, typeConfig);
          obs.variantIndex = vi;
          this.scene.add(obs.mesh);
          this.pools[typeName][vi].push(obs);
        }
      }
    }

    this.activeBySegment = new Map();
  }

  /**
   * Prepara un template a partir de la escena GLB original.
   *
   * Devuelve un Group contenedor con el modelo ya:
   *   - Escalado para que su altura coincida con targetHeight.
   *   - Centrado en X y Z.
   *   - Alineado verticalmente para que la base del modelo quede
   *     en y = -yOffset dentro del wrapper (que corresponde a y = 0
   *     en el mundo, el nivel del track).
   *   - Hundido por ySink para forzar una linea de contacto visible.
   *
   * El wrapper se posiciona en el mundo con place()/advance(), y el
   * modelo conserva su offset intacto dentro.
   */
  _prepareTemplate(gltfScene, typeConfig) {
    const wrapper = new THREE.Group();

    const model = gltfScene.clone(true);
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

    if (!isFinite(size.y) || size.y <= 0.0001) {
      console.warn('[ObstacleGenerator] Bounding box invalido');
      return null;
    }

    // Escala para alcanzar la altura objetivo.
    const scale = typeConfig.targetHeight / size.y;
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(model);
    const centerX = (scaledBox.min.x + scaledBox.max.x) / 2;
    const centerZ = (scaledBox.min.z + scaledBox.max.z) / 2;

    // Posicion del modelo DENTRO del wrapper. Al ser hijo, este
    // offset sobrevive a los cambios de posicion del wrapper.
    //
    // baseY: queremos que scaledBox.min.y (base del modelo) quede en
    //        -yOffset dentro del wrapper, que corresponde a y=0 en
    //        el mundo (nivel del track).
    // ySink: hundimos un poco mas el modelo para forzar contacto.
    const baseY = -typeConfig.yOffset - scaledBox.min.y;
    const sink = typeConfig.ySink || 0;

    model.position.x -= centerX;
    model.position.z -= centerZ;
    model.position.y += baseY - sink;

    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = false;
        if (node.material) {
          const mats = Array.isArray(node.material)
            ? node.material
            : [node.material];
          for (const m of mats) {
            if (m.color) {
              m.color.multiplyScalar(0.85);
            }
          }
        }
      }
    });

    wrapper.add(model);
    return wrapper;
  }

  populateSegment(segment) {
    this.clearSegment(segment);

    if (Math.random() > GameConfig.obstacles.segmentFillProbability) {
      return;
    }

    const pattern = this._pickPattern();
    if (!pattern) return;

    const laneCount = GameConfig.world.laneCount;
    const occupied = Math.min(pattern.occupiedLanes, laneCount);
    const laneIndices = this._pickLanes(occupied, laneCount);
    if (laneIndices.length < occupied) return;

    const types = pattern.types.slice();
    while (types.length < occupied) types.push(types[types.length - 1]);

    const z = segment.group.position.z;
    const obstacles = [];

    for (let i = 0; i < occupied; i++) {
      const lane = laneIndices[i];
      const typeName = types[i];
      const obs = this._takeFromPool(typeName);
      if (!obs) continue;
      obs.place(lane, z);
      obstacles.push(obs);
    }

    if (obstacles.length > 0) {
      this.activeBySegment.set(segment, obstacles);
    }
  }

  clearSegment(segment) {
    const obstacles = this.activeBySegment.get(segment);
    if (!obstacles) return;
    for (const obs of obstacles) {
      obs.hide();
      const typePools = this.pools[obs.typeName];
      if (typePools && typePools[obs.variantIndex]) {
        typePools[obs.variantIndex].push(obs);
      }
    }
    this.activeBySegment.delete(segment);
  }

  advance(delta) {
    for (const obstacles of this.activeBySegment.values()) {
      for (const obs of obstacles) {
        obs.advance(delta);
      }
    }
  }

  getActiveObstacles() {
    const result = [];
    for (const obstacles of this.activeBySegment.values()) {
      for (const obs of obstacles) {
        if (obs.mesh.visible) result.push(obs);
      }
    }
    return result;
  }

  reset() {
    for (const segment of Array.from(this.activeBySegment.keys())) {
      this.clearSegment(segment);
    }
  }

  _pickPattern() {
    const level = this.difficulty.level;
    const laneCount = GameConfig.world.laneCount;
    const candidates = [];

    for (const pattern of GameConfig.obstacles.patterns) {
      if (level < pattern.minLevel) continue;
      if (pattern.occupiedLanes > laneCount) continue;

      if (pattern.occupiedLanes === laneCount) {
        const allJumpable = pattern.types.every(
          (t) => GameConfig.obstacles.types[t]?.jumpable === true
        );
        if (!allJumpable) continue;
      }

      const slots = Math.max(1, Math.round(pattern.weight * 10));
      for (let i = 0; i < slots; i++) candidates.push(pattern);
    }

    if (candidates.length === 0) return null;
    return candidates[randomInt(0, candidates.length - 1)];
  }

  _pickLanes(count, laneCount) {
    const available = [];
    for (let i = 0; i < laneCount; i++) available.push(i);

    for (let i = 0; i < count && i < available.length; i++) {
      const j = randomInt(i, available.length - 1);
      const tmp = available[i];
      available[i] = available[j];
      available[j] = tmp;
    }
    return available.slice(0, count);
  }

  _takeFromPool(typeName) {
    const typePools = this.pools[typeName];
    if (!typePools || typePools.length === 0) return null;

    const indices = [];
    for (let i = 0; i < typePools.length; i++) indices.push(i);

    for (let i = indices.length - 1; i > 0; i--) {
      const j = randomInt(0, i);
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }

    for (const i of indices) {
      if (typePools[i].length > 0) {
        const obs = typePools[i].pop();
        obs.variantIndex = i;
        return obs;
      }
    }
    return null;
  }
}