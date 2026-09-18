/**
 * AudioManager
 *
 * Sintetiza toda la musica y los efectos del juego con Web Audio API.
 * No carga archivos externos: todo se genera en runtime.
 *
 * Ventajas de este enfoque:
 *   - Cero peso de descarga, cero problemas de licencia.
 *   - El audio puede reaccionar a la dificultad en tiempo real
 *     (el arpegio musical acelera con el nivel).
 *   - La inicializacion es perezosa: el AudioContext solo se crea
 *     tras la primera interaccion del usuario, como exigen los
 *     navegadores modernos.
 *
 * Regla del proyecto: el audio nunca debe impedir que el juego
 * funcione. Si el AudioContext falla o no esta disponible, todos los
 * metodos son no-op.
 */

import { GameConfig } from '../config/GameConfig.js';

export class AudioManager {
  constructor() {
    this.enabled = GameConfig.audio.enabled;
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    // Estado de la musica.
    this.musicPlaying = false;
    this.arpTimer = null;
    this.arpStep = 0;
    this.padOscillators = [];

    // Nivel de dificultad actual, para modular el arpegio.
    this.difficultyLevel = 0;
  }

  /**
   * Inicializa el AudioContext. Debe llamarse tras una interaccion
   * del usuario (click, tecla) para cumplir con las politicas de
   * autoplay de los navegadores. Es idempotente.
   */
  init() {
    if (!this.enabled || this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        this.enabled = false;
        return;
      }
      this.ctx = new Ctx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = GameConfig.audio.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = GameConfig.audio.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = GameConfig.audio.sfxVolume;
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      // Si el AudioContext no se puede crear, desactivamos el audio
      // entero. El juego sigue siendo completamente jugable.
      this.enabled = false;
    }
  }

  /**
   * Reanuda el AudioContext si el navegador lo suspendio (por ejemplo
   * al cambiar de pestana). Idempotente.
   */
  resume() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Ajusta el nivel de dificultad que modula la velocidad del arpegio.
   * Se llama desde Game cada frame.
   *
   * @param {number} level nivel continuo [0, 1]
   */
  setDifficultyLevel(level) {
    this.difficultyLevel = level;
  }

  /**
   * Inicia la musica de fondo. Crea un pad sostenido y programa el
   * arpegio.
   */
  startMusic() {
    if (!this.enabled || !this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;

    // Pad: dos osciladores ligeramente desafinados crean un efecto
    // de coro sin necesidad de efectos adicionales.
    const baseFreq = GameConfig.audio.music.padBaseFreq;
    const padGain = this.ctx.createGain();
    padGain.gain.value = 0.0;
    padGain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 1.5);
    padGain.connect(this.musicGain);

    const freqs = [baseFreq, baseFreq * 1.005, baseFreq * 0.5];
    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(padGain);
      osc.start();
      this.padOscillators.push(osc);
    }

    this._scheduleArp();
  }

  /**
   * Detiene la musica de fondo y libera los osciladores del pad.
   */
  stopMusic() {
    if (!this.musicPlaying) return;
    this.musicPlaying = false;

    if (this.arpTimer !== null) {
      clearTimeout(this.arpTimer);
      this.arpTimer = null;
    }

    for (const osc of this.padOscillators) {
      try { osc.stop(); } catch (e) { /* ya detenido */ }
    }
    this.padOscillators = [];
    this.arpStep = 0;
  }

  /**
   * Reproduce un efecto de sonido por nombre.
   *
   * @param {string} name clave dentro de GameConfig.audio.sfx
   */
  playSfx(name) {
    if (!this.enabled || !this.ctx) return;
    const def = GameConfig.audio.sfx[name];
    if (!def) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = def.type;
    osc.frequency.setValueAtTime(def.freqStart, now);
    if (def.freqEnd !== def.freqStart) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, def.freqEnd),
        now + def.duration
      );
    }

    const gain = this.ctx.createGain();
    // Envolvente ADSR simplificada: ataque rapido, caida exponencial.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(def.volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + def.duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + def.duration + 0.05);
  }

  /**
   * Programa el siguiente paso del arpegio. La frecuencia entre notas
   * depende del nivel de dificultad actual: a nivel 0 es lenta, a
   * nivel 1 es rapida. Esto hace que la musica acelere con el juego
   * sin cambiar de pista ni de instrumentacion.
   */
  _scheduleArp() {
    if (!this.musicPlaying) return;

    const cfg = GameConfig.audio.music;
    const interval = cfg.arpIntervalStart +
      (cfg.arpIntervalEnd - cfg.arpIntervalStart) * this.difficultyLevel;

    // Nota actual de la escala.
    const semitones = cfg.arpScale[this.arpStep % cfg.arpScale.length];
    const freq = cfg.arpBaseFreq * Math.pow(2, semitones / 12);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + interval * 0.9);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + interval);

    this.arpStep++;
    this.arpTimer = setTimeout(() => this._scheduleArp(), interval * 1000);
  }

  dispose() {
    this.stopMusic();
    if (this.ctx) {
      try { this.ctx.close(); } catch (e) { /* ignorar */ }
      this.ctx = null;
    }
  }
}