/**
 * TrackSegment
 *
 * Representa un bloque de pista reutilizable. Encapsula su geometria,
 * su posicion en el mundo y la logica de reciclaje.
 *
 * Los segmentos NO se crean y destruyen continuamente: se crean una
 * vez y se reciclan cambiando su posicion Z.
 *
 * Texturas PBR:
 *   El material de la pista acepta texturas externas opcionales
 *   (albedo, normal, roughness). Se aplican a traves del metodo
 *   estatico applyTrackTextures, que se llama una sola vez tras la
 *   carga de assets. Todos los segmentos comparten el mismo material
 *   base para aprovechar el batching de Three.js.
 */

import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig.js';

// Material compartido de la pista. Se crea una vez y se reutiliza
// en todos los segmentos. Aplicar texturas a este material afecta
// a todos los segmentos a la vez, que es exactamente lo que queremos.
let sharedTrackMaterial = null;

function getSharedTrackMaterial() {
  if (sharedTrackMaterial) return sharedTrackMaterial;
  sharedTrackMaterial = new THREE.MeshStandardMaterial({
    color: GameConfig.palette.track,
    emissive: 0x1a1a3a,
    emissiveIntensity: 0.35,
    roughness: 0.65,
    metalness: 0.15,
  });
  return sharedTrackMaterial;
}

export class TrackSegment {
  constructor(index) {
    this.index = index;
    this.group = new THREE.Group();
    this.group.visible = false;

    const { segmentLength, trackWidth } = GameConfig.world;

    const trackGeo = new THREE.PlaneGeometry(trackWidth, segmentLength);
    this.track = new THREE.Mesh(trackGeo, getSharedTrackMaterial());
    this.track.rotation.x = -Math.PI / 2;
    this.group.add(this.track);

    // Linea central emisiva.
    const lineGeo = new THREE.PlaneGeometry(0.08, segmentLength);
    const lineMat = new THREE.MeshBasicMaterial({
      color: GameConfig.palette.laneLine,
      transparent: true,
      opacity: 0.55,
    });
    this.centerLine = new THREE.Mesh(lineGeo, lineMat);
    this.centerLine.rotation.x = -Math.PI / 2;
    this.centerLine.position.y = 0.01;
    this.group.add(this.centerLine);

    // Bordes emisivos.
    const borderGeo = new THREE.BoxGeometry(
      GameConfig.world.borderWidth,
      GameConfig.world.borderHeight,
      segmentLength
    );
    const borderMat = new THREE.MeshStandardMaterial({
      color: GameConfig.palette.border,
      emissive: GameConfig.palette.border,
      emissiveIntensity: 0.8,
      roughness: 0.4,
      metalness: 0.1,
    });

    const halfW = trackWidth / 2 + GameConfig.world.borderWidth / 2;
    this.borderLeft = new THREE.Mesh(borderGeo, borderMat);
    this.borderLeft.position.set(-halfW, GameConfig.world.borderHeight / 2, 0);
    this.group.add(this.borderLeft);

    this.borderRight = new THREE.Mesh(borderGeo, borderMat);
    this.borderRight.position.set(halfW, GameConfig.world.borderHeight / 2, 0);
    this.group.add(this.borderRight);
  }

  setPosition(z) {
    this.group.position.set(0, 0, z);
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
  }

  /**
   * Aplica texturas PBR al material compartido de la pista. Se llama
   * una sola vez tras la carga de assets. Si una textura es null, se
   * mantiene el valor por defecto del material para ese canal.
   *
   * @param {{diffuse: THREE.Texture|null, normal: THREE.Texture|null, roughness: THREE.Texture|null}} set
   */
  static applyTrackTextures(set) {
    const mat = getSharedTrackMaterial();
    if (set.diffuse) {
      mat.map = set.diffuse;
      // Al aplicar un mapa de color, bajamos el color base para que
      // la textura module el resultado en lugar de sumarse.
      mat.color.setHex(0xffffff);
    }
    if (set.normal) {
      mat.normalMap = set.normal;
      // Escala del normal map. Valor bajo para que el relieve sea
      // sutil y no rompa la lectura de la pista como superficie plana.
      mat.normalScale.set(0.6, 0.6);
    }
    if (set.roughness) {
      mat.roughnessMap = set.roughness;
      // Ajustamos el roughness base para que la textura module el
      // valor real. 1.0 hace que el mapa se use tal cual.
      mat.roughness = 1.0;
    }
    mat.needsUpdate = true;
  }
}