/**
 * Player
 *
 * Representacion visual y estado fisico del jugador.
 *
 * Responsabilidades:
 *   - Cargar el modelo GLB del personaje de forma asincrona.
 *   - Mantener el estado fisico: posicion, velocidad vertical, enSuelo.
 *   - Reproducir la animacion de carrera con AnimationMixer.
 *   - Exponer metodos para movimiento lateral y salto, SIN leer input
 *     directamente (eso vive en PlayerController).
 *
 * La colision NO depende del modelo visual: se usa una caja virtual
 * del tamano declarado en GameConfig.player.size. El modelo puede
 * tener brazos, piernas y animacion sin afectar al AABB.
 *
 * El jugador NO avanza en Z: el mundo se mueve hacia el.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GameConfig } from '../config/GameConfig.js';
import { clamp } from '../utils/MathUtils.js';

export class Player {
  constructor() {
    const cfg = GameConfig.player;

    // Grupo raiz: contiene el modelo visual y sirve de referencia para
    // la posicion fisica. El grupo se mueve con position, el modelo
    // interior tiene su propio offset y escala.
    this.group = new THREE.Group();

    // Sub-grupo que contiene el modelo. Se separa del grupo raiz para
    // poder aplicar scale y yOffset del modelo sin afectar a la
    // posicion fisica del jugador.
    this.modelHolder = new THREE.Group();
    this.group.add(this.modelHolder);

    // Placeholder mientras carga el GLB. Es un cubo minimo casi
    // invisible, para que el jugador tenga algo en pantalla si la
    // carga tarda. Se elimina al terminar la carga.
    const placeholderGeo = new THREE.BoxGeometry(
      cfg.size.x, cfg.size.y, cfg.size.z
    );
    const placeholderMat = new THREE.MeshBasicMaterial({
      color: GameConfig.palette.player,
      transparent: true,
      opacity: 0.15,
    });
    this.placeholder = new THREE.Mesh(placeholderGeo, placeholderMat);
    this.modelHolder.add(this.placeholder);

    // Estado fisico.
    this.position = new THREE.Vector3(0, cfg.restHeight, cfg.fixedZ);
    this.velocityY = 0;
    this.isGrounded = true;
    this.jumpCooldown = 0;

    // Limites laterales.
    const laneWidth = GameConfig.world.trackWidth / GameConfig.world.laneCount;
    this.lateralLimit = laneWidth * (GameConfig.world.laneCount - 1) / 2;

    // Estado del modelo y animacion. Se rellenan en load().
    this.model = null;
    this.mixer = null;
    this.action = null;
    this.loaded = false;

    this._syncMesh();
  }

  /**
   * Carga el modelo GLB de forma asincrona. Devuelve una promesa que
   * se resuelve cuando el modelo esta listo y la animacion arrancada.
   *
   * Si la carga falla (archivo no encontrado, formato invalido), la
   * promesa se resuelve igualmente y el juego continua con el
   * placeholder. El juego nunca debe bloquearse por un asset.
   *
   * @returns {Promise<void>}
   */
  load() {
    const cfg = GameConfig.player.model;
    const loader = new GLTFLoader();

    return new Promise((resolve) => {
      loader.load(
        cfg.path,
        (gltf) => {
          this._onModelLoaded(gltf);
          resolve();
        },
        undefined,
        (error) => {
          // Fallo de carga: dejamos el placeholder y seguimos. El
          // juego es completamente jugable sin modelo.
          console.warn(
            '[Player] No se pudo cargar el modelo:',
            cfg.path,
            error
          );
          resolve();
        }
      );
    });
  }

  /**
   * Callback de carga correcta del GLB.
   *
   * Estrategia de escalado robusta:
   *   1. Se calcula el bounding box del modelo recien cargado con
   *      setFromObject. Esto respeta cualquier transform interno del
   *      GLB (por ejemplo, un Armature con escala 0.01 tipico de las
   *      exportaciones de Blender en centimetros).
   *   2. Se deriva un factor de escala para que la altura del modelo
   *      coincida con targetHeight, sin importar la unidad de origen.
   *   3. Tras escalar, se recoloca el modelo para que sus pies
   *      queden en la base de la caja de colision, usando de nuevo
   *      el bounding box (que ya tiene en cuenta el nuevo scale).
   *
   * Este enfoque elimina los ajustes manuales de scale y yOffset y
   * hace que el sistema funcione con cualquier GLB razonable.
   */
  _onModelLoaded(gltf) {
    const cfg = GameConfig.player.model;

    // Eliminamos el placeholder.
    this.modelHolder.remove(this.placeholder);
    this.placeholder.geometry.dispose();
    this.placeholder.material.dispose();
    this.placeholder = null;

    this.model = gltf.scene;

    // Forzamos la actualizacion de matrices antes de medir. Sin esto,
    // setFromObject puede leer matrices obsoletas.
    this.model.updateMatrixWorld(true);

    // Paso 1: medir el modelo tal cual viene.
    const boxBefore = new THREE.Box3().setFromObject(this.model);
    const sizeBefore = new THREE.Vector3();
    boxBefore.getSize(sizeBefore);

    // Proteccion contra bounding boxes vacios o invalidos.
    // Si el GLB no tiene geometria medible, dejamos el modelo sin
    // escalar y avisamos por consola. Es preferible un modelo mal
    // escalado a un crash.
    if (!isFinite(sizeBefore.y) || sizeBefore.y <= 0.0001) {
      console.warn(
        '[Player] Bounding box invalido. No se aplica auto-escala.',
        sizeBefore
      );
      this.modelHolder.add(this.model);
      this.loaded = true;
      return;
    }

    // Paso 2: calcular y aplicar la escala.
    const autoScale = (cfg.targetHeight / sizeBefore.y) * cfg.scaleMultiplier;
    this.model.scale.setScalar(autoScale);
    this.model.updateMatrixWorld(true);

    // Paso 3: medir de nuevo tras escalar y recolocar para que los
    // pies queden en la base de la caja de colision.
    const boxAfter = new THREE.Box3().setFromObject(this.model);
    // La caja de colision tiene su base en -size.y/2 dentro del
    // holder. Los pies del modelo deben coincidir con esa base.
    const footOffset = -GameConfig.player.size.y / 2 - boxAfter.min.y;
    this.model.position.y += footOffset;

    // Rotacion.
    this.model.rotation.y = cfg.rotationY;

    // Sombras.
    this.model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = false;
      }
    });

    this.modelHolder.add(this.model);

    // Animacion.
    if (gltf.animations && gltf.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.model);

      let clip = gltf.animations[0];
      if (cfg.animationName) {
        const found = gltf.animations.find(
          (c) => c.name === cfg.animationName
        );
        if (found) clip = found;
      }

      this.action = this.mixer.clipAction(clip);
      this.action.setLoop(THREE.LoopRepeat, Infinity);
      this.action.timeScale = cfg.animationTimeScale;
      this.action.play();
    }

    this.loaded = true;
  }

  applyLateral(direction, dt) {
    if (direction === 0) return;
    const speed = GameConfig.player.lateralSpeed;
    this.position.x += direction * speed * dt;
    this.position.x = clamp(this.position.x, -this.lateralLimit, this.lateralLimit);
  }

  tryJump() {
    if (!this.isGrounded || this.jumpCooldown > 0) return false;
    this.velocityY = GameConfig.player.jumpImpulse;
    this.isGrounded = false;
    this.jumpCooldown = GameConfig.player.jumpCooldown;
    return true;
  }

  /**
   * Integra la fisica vertical, la animacion y sincroniza la malla.
   */
  update(dt) {
    if (this.jumpCooldown > 0) this.jumpCooldown -= dt;

    this.velocityY += GameConfig.player.gravity * dt;
    this.position.y += this.velocityY * dt;

    const rest = GameConfig.player.restHeight;
    if (this.position.y <= rest) {
      this.position.y = rest;
      this.velocityY = 0;
      this.isGrounded = true;
    }

    // La animacion avanza con dt. El mixer reproduce el clip en loop
    // indefinidamente. Si en el futuro se quiere pausar la animacion
    // al saltar, se puede hacer con this.action.paused = !isGrounded.
    if (this.mixer) {
      this.mixer.update(dt);
    }

    this._syncMesh();
  }

  reset() {
    const cfg = GameConfig.player;
    this.position.set(0, cfg.restHeight, cfg.fixedZ);
    this.velocityY = 0;
    this.isGrounded = true;
    this.jumpCooldown = 0;
    this._syncMesh();
  }

  _syncMesh() {
    this.group.position.copy(this.position);
  }

  dispose() {
    if (this.model) {
      this.model.traverse((node) => {
        if (node.isMesh) {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            if (Array.isArray(node.material)) {
              node.material.forEach((m) => m.dispose());
            } else {
              node.material.dispose();
            }
          }
        }
      });
    }
  }
}