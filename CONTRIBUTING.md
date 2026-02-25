# Contributing to Agilens / Contribuir a Agilens

Thank you for your interest in contributing! / ¡Gracias por tu interés en contribuir!

---

## English

### Philosophy

Agilens is a **focused, atomic** note-taking and agile management PWA.
Contributions are welcome, but we deliberately keep the scope tight:

- Every feature must solve **one well-defined problem**.
- Contributions should be **small and reviewable** — large multi-feature PRs will be asked to split.
- The app runs **entirely in the browser** — no backend, no server dependencies.
- Prefer **inline styles** and existing CSS variables over adding new dependencies.

### Ways to Contribute

| Type             | How                                                       |
| ---------------- | --------------------------------------------------------- |
| 🐛 Bug report    | Open an Issue → `Bug Report` template                     |
| 💡 Feature idea  | Open an Issue → `Feature Request` template                |
| 📖 Documentation | Edit `README.md`, `CHANGELOG.md`, or inline code comments |
| 🔧 Code fix      | Fork → branch → PR                                        |
| 🌐 Translation   | Open an Issue to discuss scope first                      |

### Before You Start

1. **Search existing Issues and PRs** — your idea may already be tracked.
2. For non-trivial changes, **open an Issue first** to discuss approach before writing code.
3. For bugs, include steps to reproduce, browser/OS, and a screenshot if visual.

### Development Setup

```bash
# Clone
git clone https://github.com/sazardev/agilens.git
cd agilens

# Install
npm install

# Dev server (with HMR)
npm run dev

# Type-check
npx tsc --noEmit

# Build
npm run build
```

**Requirements:** Node ≥ 18, npm ≥ 9.

### Branch Naming

```
feat/short-description       # new feature
fix/short-description        # bug fix
docs/short-description       # documentation only
refactor/short-description   # code restructure, no behavior change
```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add light preset to onboarding
fix: remove unused pullStatus variable
docs: update CHANGELOG for v0.2.0
refactor: extract writeConfigFile to client.ts
chore: bump version to 0.2.0
```

### Pull Request Rules

- **One logical change per PR** — do not bundle unrelated fixes.
- PRs must pass `tsc --noEmit` with **zero errors**.
- Include a clear description of _what_ changed and _why_.
- Reference the related Issue: `Closes #42`.
- Keep diff size reasonable — aim for < 400 lines changed per PR.
- Do not add new `npm` dependencies without prior discussion in an Issue.

### TypeScript Guidelines

- Strict TypeScript — no `any` unless absolutely necessary (add a comment explaining why).
- Use existing types from `src/types/index.ts`; extend them rather than duplicating.
- All new functions must have explicit return types.

### Style Guidelines

- **No CSS frameworks** — use inline styles and CSS variables (`var(--text-0)`, `var(--accent-400)`, etc.).
- **No emoji in code** — use SVG icon components from `src/lib/noteIcons.tsx` or inline SVG.
- Inline SVG icons: `stroke="currentColor"`, `fill="none"`, consistent `strokeWidth`.
- Component files are self-contained and co-located with their page or feature.

### What We Will NOT Accept

- Features that require a backend or external API beyond GitHub.
- Large UI overhauls without prior design discussion.
- Breaking changes to the Redux state shape without a migration path.
- New npm dependencies for things achievable with browser APIs.
- AI-generated code submitted without review or understanding.

---

## Español

### Filosofía

Agilens es una PWA **enfocada y atómica** de gestión de notas y metodologías ágiles.
Las contribuciones son bienvenidas, pero el alcance se mantiene deliberadamente acotado:

- Cada funcionalidad debe resolver **un problema bien definido**.
- Las contribuciones deben ser **pequeñas y revisables** — los PRs con múltiples funcionalidades serán pedidos para dividir.
- La app funciona **completamente en el navegador** — sin backend, sin dependencias de servidor.
- Se prefiere **estilos en línea** y variables CSS existentes sobre añadir nuevas dependencias.

### Formas de Contribuir

| Tipo                     | Cómo                                                       |
| ------------------------ | ---------------------------------------------------------- |
| 🐛 Reporte de bug        | Abrir Issue → plantilla `Bug Report`                       |
| 💡 Idea de funcionalidad | Abrir Issue → plantilla `Feature Request`                  |
| 📖 Documentación         | Editar `README.md`, `CHANGELOG.md` o comentarios en código |
| 🔧 Corrección de código  | Fork → rama → PR                                           |
| 🌐 Traducción            | Abrir Issue para discutir el alcance primero               |

### Antes de Empezar

1. **Busca Issues y PRs existentes** — tu idea puede ya estar registrada.
2. Para cambios no triviales, **abre un Issue primero** para discutir el enfoque antes de escribir código.
3. Para bugs, incluye pasos para reproducir, navegador/OS y captura de pantalla si es visual.

### Configuración de Desarrollo

```bash
# Clonar
git clone https://github.com/sazardev/agilens.git
cd agilens

# Instalar
npm install

# Servidor de desarrollo (con HMR)
npm run dev

# Verificar tipos
npx tsc --noEmit

# Construir
npm run build
```

**Requisitos:** Node ≥ 18, npm ≥ 9.

### Nomenclatura de Ramas

```
feat/descripcion-corta       # nueva funcionalidad
fix/descripcion-corta        # corrección de bug
docs/descripcion-corta       # solo documentación
refactor/descripcion-corta   # reestructura sin cambio de comportamiento
```

### Convención de Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/es/):

```
feat: agregar preset modo claro al onboarding
fix: eliminar variable pullStatus no usada
docs: actualizar CHANGELOG para v0.2.0
refactor: extraer writeConfigFile a client.ts
chore: actualizar versión a 0.2.0
```

### Reglas para Pull Requests

- **Un cambio lógico por PR** — no agrupar correcciones no relacionadas.
- Los PRs deben pasar `tsc --noEmit` con **cero errores**.
- Incluir descripción clara de _qué_ cambió y _por qué_.
- Referenciar el Issue relacionado: `Closes #42`.
- Mantener el tamaño del diff razonable — menos de 400 líneas cambiadas por PR.
- No añadir nuevas dependencias `npm` sin discusión previa en un Issue.

### Lo que NO Aceptaremos

- Funcionalidades que requieran backend o API externa más allá de GitHub.
- Rediseños grandes de UI sin discusión previa de diseño.
- Cambios que rompan la forma del estado Redux sin un camino de migración.
- Nuevas dependencias npm para cosas alcanzables con APIs del navegador.
- Código generado por IA enviado sin revisión ni comprensión.
