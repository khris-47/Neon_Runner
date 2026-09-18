/**
 * SceneManager
 *
 * Encapsula la creacion y posesion de la escena, el renderer, la
 * camara y la cadena de postprocesado.
 *
 * El fondo del scene ya no es un color solido: lo cubre la esfera de
 * cielo (ver Sky.js). Se mantiene el clearColor del renderer en el
 * color de fondo por si el cielo no esta disponible (fallback).
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GameConfig } from '../config/GameConfig.js';

export class SceneManager {
  constructor(container) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(GameConfig.palette.background, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    // El cielo (Sky.js) rellena el fondo. Se mantiene un color de
    // fallback en el renderer por si el cielo no esta activo.
    this.scene.background = null;

    this.scene.fog = new THREE.FogExp2(
      GameConfig.fog.color,
      GameConfig.fog.density
    );

    this.camera = new THREE.PerspectiveCamera(
      GameConfig.camera.fov,
      container.clientWidth / container.clientHeight,
      GameConfig.camera.near,
      GameConfig.camera.far
    );
    this.camera.position.set(0, 5, 9);

    this.composer = null;
    this.bloomPass = null;
    this._setupPostProcessing();

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  _setupPostProcessing() {
    if (!GameConfig.postprocessing.bloom.enabled) return;

    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const cfg = GameConfig.postprocessing.bloom;
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(
        this.container.clientWidth,
        this.container.clientHeight
      ),
      cfg.strength,
      cfg.radius,
      cfg.threshold
    );
    this.composer.addPass(this.bloomPass);
  }

  render() {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}