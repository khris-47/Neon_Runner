/**
 * MathUtils
 *
 * Utilidades matematicas compartidas. Se mantienen aqui funciones puras
 * que no dependen de Three.js ni del estado del juego, para que sean
 * faciles de testear y reutilizar.
 */

/**
 * Interpolacion lineal entre a y b con factor t.
 * t se asume en el rango [0, 1].
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Interpolacion exponencial independiente del framerate.
 *
 * A diferencia de lerp(a, b, factor) con factor fijo por frame, esta
 * version es estable frente a variaciones de dt. Se usa para suavizar
 * camara y movimiento lateral sin que el comportamiento cambie entre
 * maquinas rapidas y lentas.
 *
 * @param {number} a valor actual
 * @param {number} b valor objetivo
 * @param {number} smoothing factor de suavizado (0..1), mayor = mas rapido
 * @param {number} dt delta time en segundos
 */
export function damp(a, b, smoothing, dt) {
  const t = 1 - Math.pow(1 - smoothing, dt * 60);
  return a + (b - a) * t;
}

/**
 * Restringe v al rango [min, max].
 */
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/**
 * Devuelve un entero aleatorio en el rango [min, max] inclusive.
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Devuelve un flotante aleatorio en el rango [min, max).
 */
export function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Elige un elemento aleatorio de un array.
 */
export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}