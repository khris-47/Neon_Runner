/**
 * Fonts
 *
 * Gestiona la fuente externa del proyecto. Expone una constante con
 * el nombre de la familia y un helper para construir el valor CSS
 * completo de font-family con fallbacks.
 *
 * Si la fuente no esta disponible, el navegador usara el fallback
 * (ui-monospace) sin que el layout se rompa.
 */

export const FONT_FAMILY = 'Orbitron';

/**
 * Devuelve el valor CSS de font-family para usar en estilos inline.
 */
export function fontStack() {
  return `'${FONT_FAMILY}', ui-monospace, 'Courier New', monospace`;
}