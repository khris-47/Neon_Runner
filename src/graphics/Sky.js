/**
 * Sky
 *
 * Cielo procedural con gradiente vertical y estrellas. Se implementa
 * como una esfera grande con un ShaderMaterial que pinta un gradiente
 * segun la direccion vertical, mas un sistema de Points para las
 * estrellas.
 *
 * La esfera sigue a la camara en cada frame para que el jugador
 * nunca alcance su borde. Como el gradiente depende solo de la
 * direccion (no de la posicion), el movimiento no produce parallax
 * perceptible.
 *
 * El color del horizonte coincide con el color de la niebla, para
 * que la pista se funda con el cielo al fondo de la escena y no
 * aparezca una linea de corte visible.
 */

import * as THREE from 'three';

const SKY_VERTEX = `
varying vec3 vWorldPosition;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAGMENT = `
uniform vec3 topColor;
uniform vec3 horizonColor;
uniform vec3 bottomColor;
uniform float exponent;
varying vec3 vWorldPosition;

void main() {
  // Direccion desde el centro de la esfera. La esfera sigue a la
  // camara, asi que esto equivale a la direccion de vista.
  vec3 dir = normalize(vWorldPosition);

  // t = 0 en el horizonte (y=0), 1 en el cenit, -1 en el nadir.
  // El max() evita que valores negativos pequenos por precision
  // numerica cambien de rama antes de tiempo.
  float t = dir.y;

  vec3 color;
  if (t >= 0.0) {
    // Hemisferio superior: del horizonte al cenit.
    float f = pow(clamp(t, 0.0, 1.0), exponent);
    color = mix(horizonColor, topColor, f);
  } else {
    // Hemisferio inferior: del horizonte al nadir. Aqui va el
    // color de fondo del juego (el mismo que la niebla).
    float f = pow(clamp(-t, 0.0, 1.0), exponent);
    color = mix(horizonColor, bottomColor, f);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

export class Sky {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   */
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // Colores del gradiente. Cambiar estos valores cambia la
    // identidad visual del cielo. El horizonte debe coincidir con
    // GameConfig.fog.color para que no haya corte entre pista y
    // cielo.
    const top = new THREE.Color(0x02020a);       
    const horizon = new THREE.Color(0x3a0a5a);   
    const bottom = new THREE.Color(0x1a0528);   

    // Esfera grande, vista desde dentro (BackSide).
    const geometry = new THREE.SphereGeometry(500, 32, 16);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: top },
        horizonColor: { value: horizon },
        bottomColor: { value: bottom },
        exponent: { value: 0.6 },
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      // El cielo no debe ser afectado por la niebla de la escena,
      // porque el propio gradiente ya hace de fondo. Si lo fuera,
      // la niebla se sumaria al gradiente y quedaria un tono
      // incorrecto.
      fog: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    // Render temprano para que cualquier otra cosa lo tape.
    this.mesh.renderOrder = -1;
    scene.add(this.mesh);

    // Estrellas: puntos distribuidos en una esfera hueca alrededor
    // del jugador, solo en el hemisferio superior, para no meter
    // puntos debajo de la pista.
    this.stars = this._createStars(450);
    scene.add(this.stars);
  }

  /**
   * Crea el sistema de estrellas. Cada estrella tiene una posicion
   * aleatoria en una esfera de radio grande y un tamano aleatorio.
   * El shader dibuja un punto redondo con degradado radial.
   */
  _createStars(count) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribucion uniforme en una esfera, luego nos quedamos solo
      // con el hemisferio superior para no meter estrellas bajo la
      // pista.
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);

      const r = 320 + Math.random() * 80;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(r * Math.cos(phi)) + 30;
      const z = r * Math.sin(phi) * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      sizes[i] = 0.6 + Math.random() * 1.6;
      // Fase aleatoria para el parpadeo. Se usa en el shader.
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        uniform float time;
        varying float vAlpha;
        void main() {
          // Parpadeo sutil: cada estrella oscila con su propia fase.
          float flicker = 0.75 + 0.25 * sin(time * 1.5 + phase);
          vAlpha = flicker;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c) * 2.0;
          float a = smoothstep(1.0, 0.0, d) * vAlpha;
          if (a < 0.02) discard;
          gl_FragColor = vec4(0.85, 0.9, 1.0, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = -1;
    return points;
  }

  /**
   * Sigue a la camara y actualiza el parpadeo de las estrellas.
   * Se llama cada frame desde Game.
   *
   * @param {THREE.Vector3} cameraPosition
   * @param {number} elapsedTime tiempo total transcurrido en segundos
   */
  update(cameraPosition, elapsedTime) {
    this.mesh.position.copy(cameraPosition);
    this.stars.position.copy(cameraPosition);
    this.stars.material.uniforms.time.value = elapsedTime;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.scene.remove(this.stars);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.stars.geometry.dispose();
    this.stars.material.dispose();
  }
}