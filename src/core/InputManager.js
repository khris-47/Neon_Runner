/**
 * InputManager
 *
 * Captura y normaliza la entrada del teclado y de la pantalla tactil.
 *
 * Responsabilidades:
 *   - Traducir teclas fisicas y gestos tactiles a acciones logicas.
 *   - Exponer el estado actual de cada accion por frame.
 *   - Ofrecer metodos de "consumo" para acciones que deben dispararse
 *     una sola vez por gesto (jump, laneChange).
 *
 * Dos modelos de entrada coexisten:
 *   - Teclado: movimiento lateral continuo mientras la tecla esta
 *     pulsada (isDown('left'/'right')).
 *   - Touch: cambio de carril discreto por swipe (consumeLaneChange).
 *
 * El flag `enabled` controla si los gestos tactiles se procesan.
 * Game lo activa durante PLAYING y lo desactiva en MENU, PAUSA y
 * GAME_OVER, para que los toques en los botones de las pantallas no
 * disparen acciones de juego.
 */

export class InputManager {
  constructor() {
    // Mapa de accion -> teclas fisicas que la activan.
    this.keyMap = {
      left: ['KeyA', 'ArrowLeft'],
      right: ['KeyD', 'ArrowRight'],
      jump: ['KeyW', 'ArrowUp', 'Space'],
    };

    // Estado continuo de teclado.
    this.state = { left: false, right: false, jump: false };

    // Banderas de "recien pulsado" que se consumen al consultarlas.
    this.justPressed = { jump: false };

    // Cambio de carril pendiente por gesto tactil. -1, 0 o 1.
    this._pendingLaneChange = 0;

    // Habilita o deshabilita los gestos tactiles. Game lo controla.
    this.enabled = true;

    // Estado del gesto tactil en curso.
    this._touchActive = false;
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchStartTime = 0;

    // Umbrales del reconocimiento de gestos, en pixeles y ms.
    // Ajustables si la sensacion no es la adecuada.
    this.TOUCH_SWIPE_THRESHOLD = 30;
    this.TOUCH_TAP_MAX_DURATION = 220;
    this.TOUCH_TAP_MAX_DIST = 15;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
  }

  attach(target = window) {
    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp);
    target.addEventListener('touchstart', this._onTouchStart, { passive: false });
    target.addEventListener('touchmove', this._onTouchMove, { passive: false });
    target.addEventListener('touchend', this._onTouchEnd, { passive: false });
    target.addEventListener('touchcancel', this._onTouchEnd, { passive: false });
  }

  detach(target = window) {
    target.removeEventListener('keydown', this._onKeyDown);
    target.removeEventListener('keyup', this._onKeyUp);
    target.removeEventListener('touchstart', this._onTouchStart);
    target.removeEventListener('touchmove', this._onTouchMove);
    target.removeEventListener('touchend', this._onTouchEnd);
    target.removeEventListener('touchcancel', this._onTouchEnd);
  }

  isDown(action) {
    return this.state[action] === true;
  }

  consumeJump() {
    if (this.justPressed.jump) {
      this.justPressed.jump = false;
      return true;
    }
    return false;
  }

  /**
   * Devuelve el cambio de carril pendiente y lo consume.
   * Devuelve -1 (izquierda), 1 (derecha) o 0 (sin cambio).
   */
  consumeLaneChange() {
    if (this._pendingLaneChange === 0) return 0;
    const v = this._pendingLaneChange;
    this._pendingLaneChange = 0;
    return v;
  }

  _onKeyDown(e) {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) {
      e.preventDefault();
    }

    for (const action in this.keyMap) {
      if (this.keyMap[action].includes(e.code)) {
        if (!this.state[action]) {
          if (action === 'jump') this.justPressed.jump = true;
        }
        this.state[action] = true;
      }
    }
  }

  _onKeyUp(e) {
    for (const action in this.keyMap) {
      if (this.keyMap[action].includes(e.code)) {
        this.state[action] = false;
      }
    }
  }

  /**
   * Determina si el evento tactil debe procesarse como accion de
   * juego. Se ignoran los toques sobre botones y elementos de UI
   * interactivos, para que pulsar PAUSA o REINTENTAR no dispare un
   * salto ni un cambio de carril.
   */
  _shouldHandleTouch(e) {
    if (!this.enabled) return false;
    const t = e.target;
    if (!t) return true;
    if (t.tagName === 'BUTTON') return false;
    if (t.closest && t.closest('button')) return false;
    return true;
  }

  _onTouchStart(e) {
    if (!this._shouldHandleTouch(e)) return;
    // Solo el primer dedo cuenta. Ignoramos los adicionales para no
    // interrumpir el gesto en curso.
    if (this._touchActive) return;

    const touch = e.changedTouches[0];
    this._touchActive = true;
    this._touchStartX = touch.clientX;
    this._touchStartY = touch.clientY;
    this._touchStartTime = performance.now();
  }

  _onTouchMove(e) {
    // Evitamos scroll, zoom y gestos del navegador mientras haya un
    // gesto activo.
    if (this._touchActive) {
      e.preventDefault();
    }
  }

  _onTouchEnd(e) {
    if (!this._touchActive) return;
    this._touchActive = false;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - this._touchStartX;
    const dy = touch.clientY - this._touchStartY;
    const dist = Math.hypot(dx, dy);
    const duration = performance.now() - this._touchStartTime;

    // Tap: sin desplazamiento significativo y rapido.
    if (dist < this.TOUCH_TAP_MAX_DIST &&
        duration < this.TOUCH_TAP_MAX_DURATION) {
      this.justPressed.jump = true;
      return;
    }

    // Sin desplazamiento suficiente para ser swipe.
    if (dist < this.TOUCH_SWIPE_THRESHOLD) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Swipe horizontal: cambio de carril.
      this._pendingLaneChange = dx > 0 ? 1 : -1;
    } else {
      // Swipe vertical.
      if (dy < 0) {
        // Hacia arriba: salto.
        this.justPressed.jump = true;
      }
      // Hacia abajo: reservado para un futuro "fast fall".
    }
  }
}