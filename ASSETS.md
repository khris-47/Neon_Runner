# Assets externos

Registro de todos los recursos externos utilizados por el proyecto,
con su origen y licencia. Cualquier asset debe anadirse aqui ANTES
de integrarse en el codigo.

## Reglas

1. Identificar el sitio de origen y el recurso concreto.
2. Comprobar la licencia especifica del recurso.
3. Comprobar si permite uso comercial.
4. Comprobar si exige atribucion.
5. Comprobar restricciones adicionales.
6. Usar unicamente recursos con licencia compatible.
7. Evitar recursos con licencia ambigua o solo para uso personal.

## Assets utilizados

| Asset | Tipo | Fuente | Autor | Licencia | Atribucion requerida | Notas |
|-------|------|--------|-------|----------|----------------------|-------|
| Universal Base Characters | Modelo 3D | https://quaternius.com/packs/universalbasecharacters.html | Quaternius | CC0 | No | Personaje base low-poly. Exportado a GLB desde Blender con animacion de carrera de Mixamo aplicada. |
| Mixamo Running | Animacion | https://www.mixamo.com/ | Adobe | Gratuita, uso comercial permitido | No | Animacion de carrera. Descargada como FBX In Place y aplicada al personaje en Blender. |

## Como reproducir la preparacion del asset

Por si hay que regenerar `character_running.glb` en el futuro:

1. Descargar el pack Universal Base Characters de Quaternius.
2. Extraer el personaje elegido en formato FBX o glTF.
3. Subirlo a Mixamo en la pestana Characters para riggearlo
   automaticamente.
4. Buscar una animacion de carrera en la pestana Animations.
5. Configurar la descarga con In Place activado, 30 fps, y
   Keyframe Reduction activado.
6. Descargar la animacion en FBX.
7. En Blender: importar el personaje, importar la animacion,
   asignar el clip al esqueleto, exportar como glTF Binary (.glb)
   con Include Animation activado y NLA Strips desactivado.
8. Colocar el resultado en `assets/models/characters/`.

## Notas

Los assets de Poly Haven (HDRI, texturas) y de Google Fonts
(Orbitron) se integraran en la siguiente fase y se registraran aqui
con la misma estructura.

| Asset | Tipo | Fuente | Autor | Licencia | Atribucion requerida | Notas |
|-------|------|--------|-------|----------|----------------------|-------|
| Car Kit | Modelos 3D | https://kenney.nl/assets/car-kit | Kenney | CC0 | No | 45 modelos de coches, karts y vehiculos. Usados como obstaculos block, barrier y pillar. |
| Train Kit | Modelos 3D | https://kenney.nl/assets/train-kit | Kenney | CC0 | No | Modelos de trenes, tranvias y locomotoras. Usados como obstaculos block y pillar. |