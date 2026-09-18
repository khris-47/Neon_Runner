/**
 * Ground
 *
 * Plano de suelo gigante que cubre todo el entorno de la pista, mas
 * alla de los bordes. Su funcion es puramente visual: conectar la
 * pista con los edificios del parallax para que no se vea un vacio
 * entre ambos. Sin este plano, el ojo interpreta que todo flota.
 *
 * El plano se coloca ligeramente por debajo de y=0 (y=-0.05) para
 * que no haya z-fighting con la pista ni con la base de los
 * obstaculos. Se sigue con la camara en cada frame para que sea
 * efectivamente infinito sin moverlo realmente.
 *
 * El color es un gradiente radial implementado con ShaderMaterial:
 * oscuro en el centro (bajo la pista) y fundiendose con el color
 * del horizonte hacia los bordes, para que el suelo y el cielo se
 * encuentren sin linea de corte.
 */

import * as THREE from 'three';

const GROUND_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GROUND_FRAGMENT = `
uniform vec3 centerColor;
uniform vec3 edgeColor;
uniform float radius;
uniform float fadeStart;
varying vec2 vUv;

void main() {
  // Distancia del centro del plano al fragmento, normalizada.
  vec2 c = vUv - vec2(0.5);
  float d = length(c) * 2.0;

  // Mezcla entre el color central y el color del horizonte.
  // En el centro (bajo la pista) domina centerColor; hacia los
  // bordes domina edgeColor, que coincide con el horizonte del
  // cielo para que no haya corte.
  float t = smoothstep(fadeStart, 1.0, d);
  vec3 color = mix(centerColor, edgeColor, t);

  gl_FragColor = vec4(color, 1.0);
}
`;

export class Ground {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   */
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // Tamano del plano. Muy grande para que cubra todo el parallax
    // y el horizonte visible.
    const size = 1500;

    const geometry = new THREE.PlaneGeometry(size, size);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        // Color bajo la pista: casi negro azulado, coherente con el
        // fondo del juego.
        centerColor: { value: new THREE.Color(0x08061a) },
        // Color hacia los bordes: debe coincidir con el horizonte
        // del cielo (Sky.js, variable horizon) para que suelo y
        // cielo se fundan sin linea visible.
        edgeColor: { value: new THREE.Color(0x2a0a3a) },
        radius: { value: 1.0 },
        // Donde empieza la transicion al color del horizonte.
        // Valores mas bajos = transicion mas temprana.
        fadeStart: { value: 0.15 },
      },
      vertexShader: GROUND_VERTEX,
      fragmentShader: GROUND_FRAGMENT,
      depthWrite: true,
      // El suelo no debe ser afectado por la niebla de la escena.
      // El gradiente del shader ya hace de "niebla" visualmente.
      fog: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    // Ligeramente por debajo de la pista para evitar z-fighting.
    this.mesh.position.y = -0.05;
    // Render temprano para que cualquier otra cosa lo tape.
    this.mesh.renderOrder = -2;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  /**
   * Sigue a la camara en X y Z. La Y se mantiene fija en -0.05.
   * Como el gradiente depende solo de la distancia al centro del
   * plano, moverlo con la camara no produce parallax perceptible.
   */
  update(cameraPosition) {
    this.mesh.position.x = cameraPosition.x;
    this.mesh.position.z = cameraPosition.z;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}