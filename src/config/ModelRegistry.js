/**
 * ModelRegistry
 *
 * Descubre automaticamente los modelos GLB de obstaculos a partir de
 * la estructura de carpetas. Cada carpeta corresponde a un tipo de
 * obstaculo:
 *
 *   src/assets/models/block/    -> variantes del tipo "block"
 *   src/assets/models/barrier/  -> variantes del tipo "barrier"
 *   src/assets/models/pillar/   -> variantes del tipo "pillar"
 *
 * Anadir un modelo nuevo consiste en copiar el .glb a la carpeta
 * correspondiente. No hay que tocar ninguna lista ni configuracion.
 *
 * Vite procesa los .glb con la query "?url" y devuelve la URL publica
 * del asset (con hash en produccion). import.meta.glob se evalua en
 * tiempo de build, asi que el descubrimiento es estatico y no depende
 * de peticiones en runtime.
 */

// Cada glob devuelve un objeto { rutaRelativa: url }. Con eager:true
// los modulos se resuelven en build time, y con import:'default' el
// valor asociado es directamente la URL del asset.
const blockModules = import.meta.glob('../assets/models/block/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
});

const barrierModules = import.meta.glob('../assets/models/barrier/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
});

const pillarModules = import.meta.glob('../assets/models/pillar/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
});

/**
 * Convierte el objeto que devuelve import.meta.glob en un array de
 * URLs ordenado alfabeticamente. El orden alfabetico hace que el
 * resultado sea determinista entre builds, lo cual es comodo para
 * depurar y para que dos ejecuciones se vean igual.
 */
function toUrlArray(modules) {
  return Object.keys(modules)
    .sort()
    .map((key) => modules[key]);
}

export const ModelRegistry = {
  block: toUrlArray(blockModules),
  barrier: toUrlArray(barrierModules),
  pillar: toUrlArray(pillarModules),
};