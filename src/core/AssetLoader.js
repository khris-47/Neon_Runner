/**
 * AssetLoader
 *
 * Carga centralizada de assets externos: HDRI, texturas, modelos y
 * fuentes. Expone metodos que devuelven promesas y cachea resultados
 * para que cargas repetidas sean instantaneas.
 *
 * Toda carga falla de forma silenciosa: si un asset no esta
 * disponible, el juego continua con los valores por defecto.
 *
 * Sobre la textura colormap de Kenney:
 *   Los modelos GLB de Kenney no llevan textura embebida: referencian
 *   un atlas compartido llamado colormap.png con una ruta relativa.
 *   Como Vite sirve los GLB desde URLs dinamicas (con hash en prod),
 *   la ruta relativa no se resuelve sola. Se usa un LoadingManager
 *   con setURLModifier para interceptar cualquier peticion que acabe
 *   en colormap.png y redirigirla a la URL real que Vite resuelve
 *   para el archivo importado.
 */

import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Vite resuelve esta importacion a la URL publica del asset, con
// hash en produccion. En dev es /src/assets/models/Textures/colormap.png.
import colormapUrl from '../assets/models/Textures/colormap.png?url';

export class AssetLoader {
  constructor() {
    this._cache = new Map();
    this._rgbeLoader = new RGBELoader();
    this._textureLoader = new THREE.TextureLoader();

    // LoadingManager compartido por todos los GLTFLoader. Su unica
    // mision es redirigir las peticiones de colormap.png a la URL
    // real resuelta por Vite.
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      // La peticion puede llegar como "Textures/colormap.png" o como
      // una ruta resuelta. Detectamos por sufijo para cubrir ambos
      // casos. Si no es colormap, devolvemos la URL tal cual.
      if (url.endsWith('colormap.png') || url.includes('colormap.png')) {
        return colormapUrl;
      }
      return url;
    });

    this._gltfLoader = new GLTFLoader(manager);
  }

  /**
   * Carga un HDRI y lo prepara como textura equirectangular.
   * Devuelve null si el archivo no esta disponible.
   */
  loadHDRI(path) {
    if (this._cache.has(path)) return this._cache.get(path);

    const promise = new Promise((resolve) => {
      try {
        this._rgbeLoader.load(
          path,
          (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            resolve(texture);
          },
          undefined,
          () => {
            console.warn('[AssetLoader] HDRI no disponible:', path);
            resolve(null);
          }
        );
      } catch (e) {
        console.warn('[AssetLoader] HDRI invalido o corrupto:', path, e);
        resolve(null);
      }
    });

    this._cache.set(path, promise);
    return promise;
  }

  /**
   * Carga una textura 2D. Devuelve null si no esta disponible.
   */
  loadTexture(path, options = {}) {
    const key = `${path}|${JSON.stringify(options)}`;
    if (this._cache.has(key)) return this._cache.get(key);

    const promise = new Promise((resolve) => {
      this._textureLoader.load(
        path,
        (texture) => {
          if (options.colorSpace !== false) {
            texture.colorSpace = THREE.SRGBColorSpace;
          }
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          const r = options.repeat || 1;
          texture.repeat.set(r, r);
          texture.anisotropy = 4;
          resolve(texture);
        },
        undefined,
        () => {
          console.warn('[AssetLoader] Textura no disponible:', path);
          resolve(null);
        }
      );
    });

    this._cache.set(key, promise);
    return promise;
  }

  /**
   * Carga un set de texturas PBR (diffuse, normal, roughness).
   */
  async loadPBRSet(paths, options = {}) {
    const [diffuse, normal, roughness] = await Promise.all([
      paths.diffuse
        ? this.loadTexture(paths.diffuse, { ...options, colorSpace: true })
        : Promise.resolve(null),
      paths.normal
        ? this.loadTexture(paths.normal, { ...options, colorSpace: false })
        : Promise.resolve(null),
      paths.roughness
        ? this.loadTexture(paths.roughness, { ...options, colorSpace: false })
        : Promise.resolve(null),
    ]);
    return { diffuse, normal, roughness };
  }

  /**
   * Carga un modelo GLB. Devuelve el gltf completo (con escena y
   * animaciones) o null si falla. El cacheo es por URL.
   */
  loadModel(path) {
    if (this._cache.has(path)) return this._cache.get(path);

    const promise = new Promise((resolve) => {
      try {
        this._gltfLoader.load(
          path,
          (gltf) => resolve(gltf),
          undefined,
          () => {
            console.warn('[AssetLoader] Modelo no disponible:', path);
            resolve(null);
          }
        );
      } catch (e) {
        console.warn('[AssetLoader] Error al cargar modelo:', path, e);
        resolve(null);
      }
    });

    this._cache.set(path, promise);
    return promise;
  }

  /**
   * Inyecta una fuente externa via FontFace API.
   */
  async loadFont(family, url) {
    if (this._cache.has(url)) return this._cache.get(url);

    const promise = (async () => {
      if (typeof FontFace === 'undefined') return false;
      try {
        const face = new FontFace(family, `url(${url})`);
        await face.load();
        document.fonts.add(face);
        return true;
      } catch (e) {
        console.warn('[AssetLoader] Fuente no disponible:', url);
        return false;
      }
    })();

    this._cache.set(url, promise);
    return promise;
  }
}