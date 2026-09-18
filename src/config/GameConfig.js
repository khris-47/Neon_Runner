/**
 * GameConfig
 *
 * Configuracion centralizada del juego. Todos los valores ajustables
 * de gameplay, dificultad, mundo, jugador, obstaculos, estetica,
 * audio y efectos viven aqui.
 *
 * Regla del proyecto: ningun sistema debe hardcodear valores magicos
 * que afecten al balance o a la dificultad. Todo pasa por este objeto
 * para que ajustar el juego no requiera tocar logica.
 *
 * Las unidades son unidades de mundo de Three.js (1 unidad ~ 1 metro).
 */

export const GameConfig = {
  world: {
    segmentLength: 22,
    trackWidth: 8,
    laneCount: 3,
    segmentsAhead: 28,
    segmentsBehind: 2,
    borderHeight: 0.6,
    borderWidth: 0.4,
  },

  player: {
    size: { x: 1.0, y: 1.0, z: 1.0 },
    restHeight: 0.5,
    fixedZ: 0,
    lateralSpeed: 12.0,
    lateralSmoothing: 0.18,
    baseForwardSpeed: 14.0,
    gravity: -40.0,
    jumpImpulse: 14.0,
    jumpCooldown: 0.15,

    /**
     * Modelo visual del personaje.
     *
     * El modelo es puramente estetico: la colision sigue siendo una
     * caja del tamano declarado en size. La escala se calcula
     * automaticamente a partir del bounding box real del GLB.
     */
    model: {
      path: '/assets/models/characters/character_running.glb',
      targetHeight: 2.6,
      scaleMultiplier: 1.0,
      rotationY: Math.PI,
      animationName: null,
      animationTimeScale: 1.0,
    },
  },

  camera: {
    fov: 65,
    near: 0.1,
    far: 250,
    offset: { x: 0, y: 5.0, z: 9.0 },
    lookAt: { x: 0, y: 1.2, z: -6.0 },
    smoothing: 0.12,
    shake: {
      amplitude: 0.8,
      duration: 0.4,
    },
  },

  /**
   * Dificultad progresiva. El nivel continuo [0, 1] se calcula a
   * partir de la distancia con una curva potencial. La velocidad de
   * avance se divide en dos tramos: suave al principio, agresiva
   * desde el nivel visible 4.
   */
  difficulty: {
    rampDistance: 1000,
    rampExponent: 0.5,

    forwardSpeed: {
      start: 20.0,
      mid: 30.0,
      end: 65.0,
    },
    speedBumpLevel: 0.2,
  },

  /**
   * Obstaculos.
   *
   * Modelo de generacion por patrones. Cada segmento elige un patron
   * que define cuantos carriles ocupa y con que tipos. Regla dura:
   * si un patron ocupa los 3 carriles, todos sus obstaculos deben
   * ser saltables.
   *
   * Los modelos concretos NO se listan aqui. Se descubren
   * automaticamente desde las carpetas:
   *   src/assets/models/block/
   *   src/assets/models/barrier/
   *   src/assets/models/pillar/
   */
  obstacles: {
    types: {
      block: {
        jumpable: false,
        targetHeight: 3.8,
        size: { x: 1.8, y: 2.5, z: 3.0 },
        yOffset: 1.25,
        // ySink hunde el modelo visual en la pista para asegurar
        // una linea de contacto visible. Sin el, las ruedas de los
        // modelos Kenney se ven como si flotaran.
        ySink: 0.4,
        color: 0xff00aa,
        emissiveIntensity: 0.15,
      },
      barrier: {
        jumpable: true,
        targetHeight: 1.7,
        size: { x: 2.2, y: 0.7, z: 1.5 },
        yOffset: 0.35,
        ySink: 0.04,
        color: 0xff5577,
        emissiveIntensity: 0.4,
      },
      pillar: {
        jumpable: false,
        targetHeight: 2.0,
        size: { x: 1.0, y: 2.0, z: 1.5 },
        yOffset: 1.0,
        ySink: 0.08,
        color: 0xaa00ff,
        emissiveIntensity: 0.35,
      },
    },

    patterns: [
      { name: 'single_block',   minLevel: 0.0,  weight: 3.0, occupiedLanes: 1, types: ['block'] },
      { name: 'single_barrier', minLevel: 0.0,  weight: 2.5, occupiedLanes: 1, types: ['barrier'] },
      { name: 'single_pillar',  minLevel: 0.05, weight: 2.0, occupiedLanes: 1, types: ['pillar'] },
      { name: 'double_block',   minLevel: 0.05, weight: 3.0, occupiedLanes: 2, types: ['block', 'block'] },
      { name: 'double_pillar',  minLevel: 0.1,  weight: 2.5, occupiedLanes: 2, types: ['pillar', 'pillar'] },
      { name: 'block_barrier',  minLevel: 0.1,  weight: 2.5, occupiedLanes: 2, types: ['block', 'barrier'] },
      { name: 'pillar_barrier', minLevel: 0.2,  weight: 2.0, occupiedLanes: 2, types: ['pillar', 'barrier'] },
      { name: 'double_barrier', minLevel: 0.2,  weight: 2.0, occupiedLanes: 2, types: ['barrier', 'barrier'] },
      { name: 'triple_barrier', minLevel: 0.25, weight: 2.5, occupiedLanes: 3, types: ['barrier', 'barrier', 'barrier'] },
    ],

    segmentFillProbability: 1.0,
  },

  score: {
    pointsPerUnit: 1.0,
    storageKey: 'neon-runner.bestScore',
  },

  palette: {
    background: 0x0a0a1f,
    fog: 0x0a0a1f,
    track: 0x1e1e46,
    trackEdge: 0x00e5ff,
    laneLine: 0x7a00ff,
    border: 0xff00aa,
    player: 0x00e5ff,
    playerAccent: 0xff00aa,
    ambient: 0x6060a0,
    directional: 0xffffff,
    particleTrail: 0x00e5ff,
    particleImpact: 0xff00aa,
    particleJump: 0x7a00ff,
  },

  fog: {
    // Este color debe coincidir con el horizonte del cielo (ver
    // Sky.js, variable horizon). Asi la pista se funde con el cielo
    // al fondo de la escena sin linea de corte visible.
    color: 0x2a0a3a,
    density: 0.006,
  },

  loop: {
    maxDelta: 0.05,
  },

  audio: {
    enabled: true,
    masterVolume: 0.7,
    musicVolume: 0.35,
    sfxVolume: 0.8,

    music: {
      padBaseFreq: 110.0,
      arpBaseFreq: 440.0,
      arpIntervalStart: 0.5,
      arpIntervalEnd: 0.2,
      arpScale: [0, 3, 5, 7, 10, 12],
    },

    sfx: {
      jump:     { type: 'triangle', freqStart: 300, freqEnd: 700,  duration: 0.18, volume: 0.5 },
      land:     { type: 'sine',     freqStart: 180, freqEnd: 90,   duration: 0.12, volume: 0.35 },
      hit:      { type: 'sawtooth', freqStart: 220, freqEnd: 40,   duration: 0.4,  volume: 0.7 },
      gameOver: { type: 'sawtooth', freqStart: 300, freqEnd: 60,   duration: 0.9,  volume: 0.6 },
      uiClick:  { type: 'square',   freqStart: 800, freqEnd: 800,  duration: 0.06, volume: 0.3 },
      levelUp:  { type: 'triangle', freqStart: 500, freqEnd: 1200, duration: 0.3,  volume: 0.5 },
    },
  },

  effects: {
    trail: {
      enabled: true,
      poolSize: 80,
      spawnInterval: 0.07,
      lifetime: 0.5,
      size: 0.22,
      color: 0x00e5ff,
      velocity: { x: 0, y: 0.4, z: 0 },
    },
    jumpBurst: {
      enabled: true,
      poolSize: 60,
      count: 14,
      lifetime: 0.5,
      size: 0.22,
      color: 0x7a00ff,
      speed: 4.0,
    },
    impact: {
      enabled: true,
      poolSize: 120,
      count: 40,
      lifetime: 0.9,
      size: 0.35,
      color: 0xff00aa,
      speed: 9.0,
    },
  },

  postprocessing: {
    bloom: {
      enabled: true,
      strength: 0.55,
      radius: 0.45,
      threshold: 0.85,
    },
  },

  assets: {
    environment: {
      hdriPath: '/assets/environment/night_sky_1k1.hdr',
    },
    textures: {
      track: {
        diffuse: '/assets/textures/track/track_diffuse_1k.jpg',
        normal: '/assets/textures/track/track_normal_1k.jpg',
        roughness: '/assets/textures/track/track_roughness_1k.jpg',
      },
      trackRepeat: 4,
    },
    font: {
      family: 'Orbitron',
      path: '/assets/fonts/Orbitron-VariableFont_wght.ttf',
    },
  },
};