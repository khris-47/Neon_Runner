# Neon Runner

Endless Runner 3D procedural para navegador. Estetica neon futurista.
Corres recorriendo una pista infinita generada proceduralmente,
esquivando obstaculos, con dificultad creciente y puntuacion persistente.

## Estado del proyecto

Este repositorio se construye por fases. Estado actual:

- Fase 1 (completada): proyecto, escena, camara, personaje, movimiento
  automatico, movimiento lateral, salto, pista infinita con pooling.
- Fase 2 (pendiente): obstaculos, colisiones, game over, reinicio,
  puntuacion con localStorage.
- Fase 3 (pendiente): dificultad progresiva, patrones de obstaculos.
- Fase 4 (pendiente): estetica completa, HUD, menus, audio.
- Fase 5 (pendiente): optimizacion y revision final.

## Tecnologias

- Three.js: render 3D WebGL.
- Vite: dev server y bundler.
- JavaScript con modulos ES (sin TypeScript).

## Instalacion y ejecucion

Requiere Node.js 18 o superior.

    npm install
    npm run dev

Abre la URL que muestra Vite (por defecto http://localhost:5173).

## Build de produccion

    npm run build
    npm run preview

El build se genera en `dist/`. La configuracion usa `base: './'` para
que pueda servirse desde cualquier subdirectorio.

## Controles

- A / Flecha izquierda: movimiento lateral a la izquierda.
- D / Flecha derecha: movimiento lateral a la derecha.
- W / Flecha arriba / Espacio: salto.

El personaje avanza automaticamente. El jugador solo controla los
movimientos defensivos.

## Estructura del proyecto

    src/
    ├── main.js                    Punto de entrada
    ├── core/                      Game, loop, estado, input
    ├── player/                    Jugador y controlador
    ├── world/                     Generacion procedural de pista
    ├── gameplay/                  Colisiones, dificultad, puntuacion
    ├── graphics/                  Escena, camara, iluminacion
    ├── ui/                        HUD y menus
    ├── audio/                     Gestion de audio
    ├── config/                    Configuracion centralizada
    └── utils/                     Utilidades matematicas

Los modulos de fases posteriores existen como stubs con su docblock
para mantener la estructura estable.

## Como funciona la generacion procedural

`WorldGenerator` mantiene un pool fijo de segmentos de pista. El
jugador esta fijo en Z=0 y el mundo se desplaza hacia +Z. Cuando un
segmento queda por detras del limite trasero, se reposiciona en la
parte delantera del pool. No hay creacion ni destruccion de objetos
durante la partida.

## Como cambiar la dificultad

Todos los parametros de balance viven en `src/config/GameConfig.js`.
En Fase 3, `DifficultyManager` modificara velocidad y frecuencia de
obstaculos en funcion de la distancia recorrida.

## Como cambiar la velocidad

`GameConfig.player.baseForwardSpeed` define la velocidad inicial. La
velocidad efectiva por frame la calcula `Game` y se la pasa a
`WorldGenerator.advance`.

## Como cambiar la estetica

Toda la paleta esta en `GameConfig.palette`. Cambiar esos valores
cambia la identidad visual completa del juego. La niebla se configura
en `GameConfig.fog`.

## Como agregar nuevos obstaculos (Fase 2)

Se anadira un pool en `ObstacleGenerator` y una fabrica de geometria
en `Obstacle`. Los obstaculos se alinearan a carriles definidos por
`GameConfig.world.laneCount`.

## Como agregar nuevos assets

Los assets externos se colocan bajo `assets/` con la estructura
indicada en `ASSETS.md`. Cada asset debe registrarse alli con su
origen, autor y licencia antes de integrarse.

## Licencias de assets

Ver `ASSETS.md`. En Fase 1 no se utiliza ningun asset externo: toda
la geometria, materiales e iluminacion son procedurales.