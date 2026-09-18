/**
 * GameState
 *
 * Enumeracion de los estados validos del juego. Se usan constantes
 * string para que sean legibles en logs y depuracion.
 *
 * Flujo permitido:
 *   MENU -> PLAYING -> GAME_OVER -> PLAYING
 *
 * Cualquier sistema que dependa del estado (loop, input, UI) debe
 * consultar este enum en lugar de usar booleanos sueltos.
 */

export const GameState = Object.freeze({
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
});