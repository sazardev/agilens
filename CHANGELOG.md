# Changelog

Todas las versiones notables de **Agilens** se documentan aquí.  
El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
y el versionado se rige por [Semantic Versioning](https://semver.org/lang/es/).

---

## [0.2.0] — 2026-02-25

### Añadido

- **Presets modo Claro** en el paso _Apariencia_ del Onboarding: 6 nuevos presets light
  (Claro Pro, Aurora, Cielo, Ámbar, Coral, Menta) agrupados visualmente junto a los oscuros.
- **Iconos SVG** de luna/sol en las secciones de presets (sin emojis).
- **`agilens.config.json`** generado automáticamente en el repo git en cada commit/init.
  Contiene toda la configuración del usuario (tema, fuentes, markdown, seguridad).
  El token de GitHub nunca se guarda; el hash de contraseña (SHA-256 unidireccional) sí se persiste
  en el repositorio privado como medida segura de sincronización multi-dispositivo.
- **`writeConfigFile` / `readConfigFile`** en `client.ts` para escribir y restaurar settings desde git.
- **Restauración automática de settings** al hacer `gitClone` o `gitPull`: el tema, fuentes,
  bloqueo y toda la configuración se sincroniza entre dispositivos.
- **CORS Proxy** integrado en push, pull y clone para evitar errores de CORS con GitHub.
- **Botón Pull** en la página Git junto al Push; muestra estado en tiempo real (Bajando…/✓/✗).
- **Changelog interactivo** en la barra de estado: clic en la versión para ver el historial completo.

### Modificado

- Swatch de presets cambia de gradiente a color sólido para mejor consistencia visual.
- Push button ahora comparte espacio con Pull button en una fila compacta.

### Corregido

- Error de tipo: `UITheme` no incluía `'system'`; eliminada la opción del selector de tema.
- `pullStatus` y `handlePull` declarados pero no usados en `GitPage.tsx`.

---

## [0.1.0] — 2026-02-01

### Añadido

- **PWA** completa (React 19 + TypeScript + Vite SWC) instalable en escritorio y móvil.
- **Editor de notas** con Markdown en tiempo real, modo split/preview/editor, temas claro/oscuro.
- **Tipos de nota**: Nota, Daily, Evidencia, Técnica, Reunión, Sprint, Tarea.
- **Onboarding** de 6 pasos: nombre, email, presets de apariencia, fuentes, github, finalizar.
- **Sidebar** colapsable con navegación a todas las secciones y agrupación de notas.
- **Kanban** drag-and-drop nativo por columnas: Backlog → Todo → En progreso → Revisión → Hecho.
- **Sprints** con gestión completa: crear, editar, cerrar, asignar tareas, ver daily por sprint.
- **Daily standup** con calendario visual, rachas y contexto de sprint.
- **Impedimentos** (bloqueos) con severidad, estado y vinculación a sprints/notas.
- **Mapa de conocimiento** (NotesMap): grafo de nodos interactivo estilo Obsidian con física.
- **Git integrado** (isomorphic-git + LightningFS): todo corre en el navegador, sin servidor.
  - `gitInit`, `gitCommit`, `gitAutoCommit`, `gitPush`, `gitPull`, `gitClone`, `gitDetect`.
  - Auto-commit al crear/cambiar de nota.
  - Historial por nota con diff línea a línea (LCS Myers) y restauración de versiones.
- **GitHub Connect**: wizard paso a paso para conectar token, verificar, crear repo y subir.
- **Carpetas** con anidado infinito, drag-and-drop, renombrar, auto-organizar por tipo/sprint.
- **Plantillas** de notas por tipo con editor inline y variables `{{title}}`, `{{date}}`.
- **Paleta de comandos** (Ctrl+K): búsqueda global de notas, sprints, dailys, bloqueos, acciones.
- **Barra de estado** con rama git, palabras, modo editor, guardado, historial de versiones.
- **Pantalla de bloqueo** con PIN/contraseña (SHA-256), timeout configurable y bloqueo al ocultar.
- **Exportación**: Markdown, HTML, ZIP con todas las notas, PDF/impresión.
- **Adjuntos**: imágenes/archivos embebidos en notas, almacenados en IndexedDB.
- **Tabla de Markdown** con editor visual de celdas.
- **Resaltado de sintaxis** con Shiki (github-dark / github-light) para 30+ lenguajes.
- **ContexTypes de datos** persistidos en localStorage (+ IndexedDB para blobs).
- **Atajos de teclado** documentados (F1 / ?).
- **Modo densidad UI**: Default / Compacto.
- **Acento de color** personalizable con 10+ presets y selector hex libre.
- **Fuente del editor** seleccionable: Fira Code, JetBrains Mono, Cascadia, IBM Plex, etc.

---

[0.2.0]: https://github.com/sazardev/agilens/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sazardev/agilens/releases/tag/v0.1.0
