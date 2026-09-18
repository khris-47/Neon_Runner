/**
 * ParallaxBackground
 *
 * Fondo de ciudad procedural en varias capas. Cada capa contiene
 * siluetas de edificios repartidos a ambos lados de la pista, a una
 * distancia X distinta. Las capas se desplazan hacia +Z con un factor
 * de la velocidad del jugador: las capas lejanas se mueven muy poco,
 * las cercanas se mueven casi como el mundo.
 *
 * Los edificios se extienden MUCHO hacia abajo (mas alla del nivel
 * del suelo logico). Esto es clave: como la pista solo cubre 8
 * unidades de ancho, no hay nada debajo de los edificios lejanos, y
 * sin esta extension se verian "colgando" en el aire. Al extenderlos
 * hacia abajo, la parte visible del edificio siempre se conecta con
 * la zona inferior de la pantalla, sin importar el angulo de camara.
 *
 * Los edificios se reciclan: cuando uno pasa por detras de la camara,
 * se reposiciona al fondo del pool.
 */

import * as THREE from 'three';

// Cuanto se extienden los edificios por debajo del nivel visible del
// suelo. Un valor grande garantiza que nunca se vea el fondo del
// edificio, sin importar el angulo de camara o la distancia.
const EXTEND_DOWN = 80;

// Configuracion de cada capa.
//
//   factor: fraccion de la velocidad del mundo que se aplica a la capa.
//   count: numero de pares de edificios por capa (izq + der).
//   spacing: separacion en Z entre edificios consecutivos.
//   offsetX: distancia lateral al eje de la pista.
//   heightRange: rango de alturas VISIBLES (por encima del suelo).
//   widthRange: rango de anchuras.
//   color: color base del edificio.
//   edgeColor: color de la linea de neon del techo.
//   edgeOpacity: opacidad de la linea de neon.
const LAYER_CONFIGS = [
  {
    factor: 0.06,
    count: 24,
    spacing: 24,
    offsetX: 85,
    heightRange: [22, 55],
    widthRange: [5, 11],
    color: 0x0a0a18,
    edgeColor: 0x1a1a4a,
    edgeOpacity: 0.3,
  },
  {
    factor: 0.18,
    count: 20,
    spacing: 20,
    offsetX: 55,
    heightRange: [12, 32],
    widthRange: [4, 8],
    color: 0x120630,
    edgeColor: 0x00e5ff,
    edgeOpacity: 0.5,
  },
  {
    factor: 0.42,
    count: 16,
    spacing: 17,
    offsetX: 32,
    heightRange: [6, 18],
    widthRange: [2.5, 6],
    color: 0x1a0838,
    edgeColor: 0xff00aa,
    edgeOpacity: 0.6,
  },
];

// Z a partir del cual un edificio se considera "pasado" y se recicla.
// La camara esta en Z≈9; con 50 hay margen suficiente.
const RECYCLE_Z = 50;

export class ParallaxBackground {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.layers = [];

    for (const cfg of LAYER_CONFIGS) {
      const layer = {
        config: cfg,
        elements: [],
        totalLength: cfg.count * cfg.spacing,
      };

      for (let i = 0; i < cfg.count; i++) {
        for (const side of [-1, 1]) {
          const building = this._createBuilding(cfg);
          building.position.z = -i * cfg.spacing;
          const lateralNoise = (Math.random() - 0.5) * 14;
          building.position.x = side * cfg.offsetX + lateralNoise;
          scene.add(building);
          layer.elements.push(building);
        }
      }

      this.layers.push(layer);
    }
  }

  /**
   * Crea un edificio: un bloque oscuro que se extiende MUCHO hacia
   * abajo, con una linea de neon en el techo. La extension hacia
   * abajo evita la sensacion de que los edificios flotan.
   */
  _createBuilding(cfg) {
    const h = cfg.heightRange[0] +
      Math.random() * (cfg.heightRange[1] - cfg.heightRange[0]);
    const w = cfg.widthRange[0] +
      Math.random() * (cfg.widthRange[1] - cfg.widthRange[0]);
    const d = w * (0.8 + Math.random() * 0.4);

    const group = new THREE.Group();

    // El cuerpo visible va de y=-EXTEND_DOWN a y=h. El centro esta en
    // y = (h - EXTEND_DOWN) / 2. Esto hace que la parte visible por
    // encima del "suelo" (y=0) siga siendo h unidades, pero el
    // bloque se extienda mucho hacia abajo para que su base quede
    // siempre fuera de pantalla.
    const totalHeight = h + EXTEND_DOWN;
    const bodyGeo = new THREE.BoxGeometry(w, totalHeight, d);
    const bodyMat = new THREE.MeshBasicMaterial({ color: cfg.color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = (h - EXTEND_DOWN) / 2;
    group.add(body);

    // Linea de neon en el techo, en y=h.
    const edgeGeo = new THREE.BoxGeometry(w * 1.02, 0.18, d * 1.02);
    const edgeMat = new THREE.MeshBasicMaterial({
      color: cfg.edgeColor,
      transparent: true,
      opacity: cfg.edgeOpacity,
    });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.y = h;
    group.add(edge);

    // Linea de neon secundaria a media altura, para dar detalle a la
    // silueta. Solo en las capas cercanas y medias, para no saturar.
    if (cfg.factor > 0.1) {
      const midEdgeGeo = new THREE.BoxGeometry(w * 1.02, 0.1, d * 1.02);
      const midEdgeMat = new THREE.MeshBasicMaterial({
        color: cfg.edgeColor,
        transparent: true,
        opacity: cfg.edgeOpacity * 0.6,
      });
      const midEdge = new THREE.Mesh(midEdgeGeo, midEdgeMat);
      midEdge.position.y = h * 0.5;
      group.add(midEdge);
    }

    group.userData.height = h;

    return group;
  }

  /**
   * Avanza todas las capas. Cada capa se mueve por `distance * factor`.
   * Cuando un edificio cruza RECYCLE_Z, se reposiciona al fondo del
   * pool.
   *
   * @param {number} distance distancia avanzada por el mundo este frame
   */
  advance(distance) {
    for (const layer of this.layers) {
      const delta = distance * layer.config.factor;
      for (const el of layer.elements) {
        el.position.z += delta;
        if (el.position.z > RECYCLE_Z) {
          el.position.z -= layer.totalLength;
        }
      }
    }
  }
}