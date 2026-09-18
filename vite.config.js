import { defineConfig } from 'vite';

/**
 * Configuracion de Vite.
 *
 * Se define una base relativa para que el build de produccion pueda
 * servirse desde cualquier subdirectorio sin romper las rutas de assets.
 * El target es ES2020 para aprovechar modulos nativos y mantener
 * compatibilidad con navegadores modernos.
 */
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
});