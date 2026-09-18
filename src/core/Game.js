/**
 * Game
 *
 * Orquestador principal. Une todos los sistemas y controla el estado.
 *
 * Responsabilidades:
 *   - Crear y poseer todos los sistemas.
 *   - Ejecutar el GameLoop.
 *   - Gestionar las transiciones:
 *       MENU -> PLAYING <-> PAUSED
 *                    |
 *                    v
 *                GAME_OVER -> PLAYING
 *   - Emitir efectos y sonidos de los eventos del gameplay.
 *   - Cargar assets externos en segundo plano sin bloquear el arranque.
 *
 * Orden del update:
 *   1. Dificultad.
 *   2. Jugador.
 *   3. Mundo y obstaculos.
 *   4. Reciclaje y repoblado.
 *   5. Colisiones.
 *   6. Puntuacion y HUD.
 *   7. Efectos.
 *   8. Camara (seguimiento) + shake.
 *   9. Cielo (sigue a la camara, actualiza parpadeo de estrellas).
 *
 * El cielo se actualiza en TODOS los caminos del _update, incluido
 * el early return cuando el estado no es PLAYING. Esto es necesario
 * porque el cielo sigue a la camara y el shake puede desplazarla
 * durante GAME_OVER; si no se actualizase, el cielo se quedaria
 * anclado a la posicion de la camara del ultimo frame de PLAYING y
 * el efecto de shake se veria raro.
 */

import { SceneManager } from '../graphics/SceneManager.js';
import { Lighting } from '../graphics/Lighting.js';
import { CameraController } from '../graphics/CameraController.js';
import { Effects } from '../graphics/Effects.js';
import { Environment } from '../graphics/Environment.js';
import { Sky } from '../graphics/Sky.js';
import { InputManager } from './InputManager.js';
import { GameLoop } from './GameLoop.js';
import { GameState } from './GameState.js';
import { AssetLoader } from './AssetLoader.js';
import { WorldGenerator } from '../world/WorldGenerator.js';
import { ObstacleGenerator } from '../world/ObstacleGenerator.js';
import { Player } from '../player/Player.js';
import { PlayerController } from '../player/PlayerController.js';
import { CollisionSystem } from '../gameplay/CollisionSystem.js';
import { ScoreManager } from '../gameplay/ScoreManager.js';
import { DifficultyManager } from '../gameplay/DifficultyManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { HUD } from '../ui/HUD.js';
import { StartScreen } from '../ui/StartScreen.js';
import { PauseScreen } from '../ui/PauseScreen.js';
import { GameOverScreen } from '../ui/GameOverScreen.js';
import { fontStack } from '../ui/Fonts.js';
import { GameConfig } from '../config/GameConfig.js';
import { ModelRegistry } from '../config/ModelRegistry.js';
import { ParallaxBackground } from '../graphics/ParallaxBackground.js';
import { Ground } from '../graphics/Ground.js';

export class Game {
  constructor(container) {
    this.container = container;

    // Infraestructura de render.
    this.sceneManager = new SceneManager(container);
    this.lighting = new Lighting(this.sceneManager.scene);
    this.cameraController = new CameraController(this.sceneManager.camera);
    this.effects = new Effects(this.sceneManager.scene);

    // Cielo. Se crea despues de la camara porque necesita seguirla.
    this.sky = new Sky(this.sceneManager.scene, this.sceneManager.camera);

    this.ground = new Ground(this.sceneManager.scene, this.sceneManager.camera);

    this.parallax = new ParallaxBackground(this.sceneManager.scene);

    // Tiempo total acumulado desde el arranque. Se usa para animar
    // el parpadeo de las estrellas y otros efectos ambientales.
    this.elapsedTime = 0;

    // Input.
    this.input = new InputManager();
    this.input.attach(window);

    // Los gestos tactiles solo se procesan durante PLAYING. En los
    // demas estados, la UI recibe los toques sin interferencia.
    this.input.enabled = false;

    // Sistemas de gameplay.
    this.difficulty = new DifficultyManager();
    this.collisions = new CollisionSystem();
    this.score = new ScoreManager();
    this.audio = new AudioManager();

    // Mundo.
    this.world = new WorldGenerator(this.sceneManager.scene);

    // El ObstacleGenerator se crea tras cargar los modelos. Hasta
    // entonces se queda en null y _update lo trata como opcional.
    this.obstacleGenerator = null;

    // Jugador.
    this.player = new Player();
    this.sceneManager.scene.add(this.player.group);
    this.playerController = new PlayerController(this.player, this.input);

    // Assets externos.
    this.assetLoader = new AssetLoader();
    this.environment = new Environment(
      this.sceneManager.scene,
      this.sceneManager.renderer
    );

    // Carga en segundo plano: no bloquea el arranque del loop.
    this._loadExternalAssets();
    this.player.load();

    // Camara en posicion inicial sin suavizado.
    this.cameraController.snap(this.player.position);

    // UI.
    this.hud = new HUD(container, () => this._pauseGame());
    this.startScreen = new StartScreen(container, () => this._startGame());
    this.pauseScreen = new PauseScreen(
      container,
      () => this._resumeGame(),
      () => this._startGame()
    );
    this.gameOverScreen = new GameOverScreen(container, () => this._startGame());

    this.forwardSpeed = GameConfig.player.baseForwardSpeed;
    this._maxSpeed = GameConfig.difficulty.forwardSpeed.end;

    this.state = GameState.MENU;
    this.startScreen.show();

    // Loop.
    this.loop = new GameLoop(
      (dt) => this._update(dt),
      () => this._render()
    );

    // Atajos globales.
    this._onGlobalKey = this._onGlobalKey.bind(this);
    window.addEventListener('keydown', this._onGlobalKey);

    // Reanudar el AudioContext al volver a la pestana.
    this._onVisibility = this._onVisibility.bind(this);
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  start() {
    this.loop.start();
  }

  stop() {
    this.loop.stop();
  }

  _startGame() {
    this.audio.init();
    this.audio.resume();

    this.startScreen.hide();
    this.pauseScreen.hide();
    this.gameOverScreen.hide();

    this.world.reset();
    if (this.obstacleGenerator) this.obstacleGenerator.reset();
    this.playerController.reset();
    this.score.reset();
    this.difficulty.reset();
    this.effects.reset();
    this.hud.reset();

    this.forwardSpeed = this.difficulty.getForwardSpeed();

    if (this.obstacleGenerator) {
      for (const segment of this.world.segments) {
        this.obstacleGenerator.populateSegment(segment);
      }
    }

    this.cameraController.clearShake();
    this.cameraController.snap(this.player.position);

    this.input.enabled = true;

    this.state = GameState.PLAYING;
    this.hud.setVisible(true);

    this.audio.playSfx('uiClick');
    this.audio.startMusic();
  }

  _pauseGame() {
    if (this.state !== GameState.PLAYING) return;
    this.input.enabled = false;
    this.state = GameState.PAUSED;
    this.hud.setVisible(false);
    this.pauseScreen.show();
    this.audio.playSfx('uiClick');
  }

  _resumeGame() {
    if (this.state !== GameState.PAUSED) return;
    this.pauseScreen.hide();
    this.input.enabled = true;
    this.hud.setVisible(true);
    this.state = GameState.PLAYING;
    this.audio.playSfx('uiClick');
    this.audio.resume();
  }

  _endGame() {
    this.state = GameState.GAME_OVER;
    this.hud.setVisible(false);

    this.input.enabled = false;
    this.effects.emitImpact(this.player.position);
    this.cameraController.shake();
    this.audio.playSfx('hit');
    this.audio.playSfx('gameOver');
    this.audio.stopMusic();

    const isRecord = this.score.finalize();
    this.gameOverScreen.show(
      this.score.currentScore,
      this.score.currentDistance,
      this.score.bestScore,
      isRecord
    );
  }

  _update(dt) {
    // Acumulamos el tiempo total. Se usa para animar el parpadeo de
    // las estrellas del cielo.
    this.elapsedTime += dt;

    // Fuera de PLAYING no se actualiza gameplay, pero el shake y el
    // cielo siguen corriendo para que GAME_OVER muestre el impacto
    // con la escena congelada pero el cielo actualizado.
    if (this.state !== GameState.PLAYING) {
      this.cameraController.updateShake(dt);
      this.sky.update(
        this.cameraController.camera.position,
        this.elapsedTime
      );
      this.ground.update(this.cameraController.camera.position);
      return;
    }

    // 1. Dificultad.
    this.difficulty.update(this.world.getDistance());
    this.forwardSpeed = this.difficulty.getForwardSpeed();
    this.audio.setDifficultyLevel(this.difficulty.level);

    // 2. Jugador. Detectamos el salto ANTES de actualizar el
    // controlador, para saber si el jugador acaba de despegar.
    const wasGrounded = this.player.isGrounded;
    this.playerController.update(dt);
    if (wasGrounded && !this.player.isGrounded) {
      this.effects.emitJumpBurst(this.player.position);
      this.audio.playSfx('jump');
    }

    // 3. Mundo y obstaculos.
    const distance = this.forwardSpeed * dt;
    this.world.advance(distance);

    this.parallax.advance(distance);

    if (this.obstacleGenerator) {
      this.obstacleGenerator.advance(distance);

      // 4. Reciclaje y repoblado.
      const recycled = this.world.consumeRecycledSegments();
      for (const segment of recycled) {
        this.obstacleGenerator.populateSegment(segment);
      }

      // 5. Colisiones.
      const activeObstacles = this.obstacleGenerator.getActiveObstacles();
      const hit = this.collisions.check(this.player, activeObstacles);
      if (hit) {
        this._endGame();
        // Aplicamos el shake una vez para que se vea este mismo
        // frame. El estado ya es GAME_OVER, pero queremos que el
        // desplazamiento de camara del impacto se vea inmediatamente.
        this.cameraController.updateShake(dt);
        this.sky.update(
          this.cameraController.camera.position,
          this.elapsedTime
        );
        this.ground.update(this.cameraController.camera.position);
        return;
      }
    } else {
      // Aun sin generador, descartamos los segmentos reciclados para
      // que no se acumulen en el buffer interno.
      this.world.consumeRecycledSegments();
    }

    // 6. Puntuacion y HUD.
    this.score.update(this.world.getDistance());
    const speedRatio = Math.min(1, this.forwardSpeed / this._maxSpeed);
    this.hud.update(
      this.score.currentScore,
      this.score.currentDistance,
      this.difficulty.getDisplayLevel(),
      speedRatio
    );

    // 7. Efectos.
    if (this.player.isGrounded) {
      this.effects.emitTrail(this.player.position, dt);
    }
    this.effects.update(dt);

    // 8. Camara. Primero el seguimiento, luego el shake encima.
    // Este orden es importante: si el shake se aplicase antes, el
    // damp del seguimiento lo borraria.
    this.cameraController.update(this.player.position, dt, false);
    this.cameraController.updateShake(dt);

    // 9. Cielo. Se actualiza al final para usar la posicion final de
    // la camara de este frame, ya con el shake aplicado. Si se
    // actualizase antes, el cielo se quedaria un frame por detras y
    // en movimientos rapidos se notaria.
    this.sky.update(
      this.cameraController.camera.position,
      this.elapsedTime
    );
    this.ground.update(this.cameraController.camera.position);
  }

  _render() {
    this.sceneManager.render();
  }

  _onGlobalKey(e) {
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (this.state === GameState.PLAYING) {
        e.preventDefault();
        this._pauseGame();
      } else if (this.state === GameState.PAUSED) {
        e.preventDefault();
        this._resumeGame();
      }
      return;
    }
    if (e.code === 'KeyR' && this.state === GameState.GAME_OVER) {
      this._startGame();
    }
  }

  _onVisibility() {
    if (document.visibilityState === 'visible') {
      this.audio.resume();
    }
  }

  /**
   * Carga asincrona de los assets externos: HDRI, texturas de pista,
   * fuente de UI y modelos de obstaculos. Todo falla silenciosamente.
   */
  async _loadExternalAssets() {
    const cfg = GameConfig.assets;

    // Fuente: no bloquea nada, se aplica cuando este lista.
    this.assetLoader
      .loadFont(cfg.font.family, cfg.font.path)
      .then((ok) => {
        if (ok) this._applyFontToUI();
      });

    // HDRI.
    const hdri = await this.assetLoader.loadHDRI(cfg.environment.hdriPath);
    if (hdri) this.environment.applyHDRI(hdri);

    // Texturas de la pista.
    const trackTextures = await this.assetLoader.loadPBRSet(
      cfg.textures.track,
      { repeat: cfg.textures.trackRepeat }
    );
    const { TrackSegment } = await import('../world/TrackSegment.js');
    TrackSegment.applyTrackTextures(trackTextures);

    // Modelos de obstaculos. Se descubren dinamicamente via
    // ModelRegistry (import.meta.glob) y se cargan en paralelo.
    // Cada tipo tiene su carpeta: block, barrier, pillar.
    const modelsByType = {};
    const loadPromises = [];

    for (const typeName in GameConfig.obstacles.types) {
      modelsByType[typeName] = [];
      const urls = ModelRegistry[typeName] || [];

      for (const url of urls) {
        const p = this.assetLoader.loadModel(url).then((gltf) => {
          if (gltf && gltf.scene) {
            modelsByType[typeName].push(gltf.scene);
          }
        });
        loadPromises.push(p);
      }
    }

    await Promise.all(loadPromises);

    this.obstacleGenerator = new ObstacleGenerator(
      this.sceneManager.scene,
      this.difficulty,
      modelsByType
    );

    // Si el jugador ya empezo una partida antes de que los modelos
    // terminaran de cargar, poblamos los segmentos ahora.
    if (this.state === GameState.PLAYING) {
      for (const segment of this.world.segments) {
        this.obstacleGenerator.populateSegment(segment);
      }
    }
  }

  /**
   * Aplica la fuente externa a las pantallas de UI.
   */
  _applyFontToUI() {
    const stack = fontStack();
    const apply = (el) => {
      if (!el) return;
      el.style.fontFamily = stack;
      el.querySelectorAll('*').forEach((child) => {
        child.style.fontFamily = stack;
      });
    };
    apply(this.hud.root);
    apply(this.startScreen.root);
    apply(this.pauseScreen.root);
    apply(this.gameOverScreen.root);
  }
}