/**
 * main.js
 *
 * Punto de entrada de la aplicacion. Su unica responsabilidad es
 * crear la instancia de Game, montarla en el DOM y arrancar el loop.
 *
 * No contiene logica de juego: toda la orquestacion vive en Game.js.
 */
import { Game } from './core/Game.js';
import * as THREE from 'three';

const container = document.getElementById('app');

if (!container) {
  throw new Error('No se encontro el contenedor #app en el DOM.');
}

const game = new Game(container);
game.start();

if (import.meta.env && import.meta.env.DEV) {
  window.__game = game;
  // Exponemos Three.js en desarrollo para poder hacer diagnosticos
  // desde la consola del navegador sin tener que importar modulos.
  window.__THREE = THREE;
}