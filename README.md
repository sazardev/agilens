# Agilens

> Tu cuaderno de desarrollo. Sin distracciones, sin dependencias, sin excusas.

<div align="center">

**La herramienta todo-en-uno para desarrolladores que trabajan en equipos ágiles.**  
Notas técnicas con evidencia real, documentación generada desde tu código,  
versionado Git nativo e integración directa con GitHub. Todo en el navegador.

</div>

---

<div align="center">

[![React](https://img.shields.io/badge/React_19-000000?style=for-the-badge&logo=react&logoColor=ffffff)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-000000?style=for-the-badge&logo=typescript&logoColor=ffffff)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-000000?style=for-the-badge&logo=vite&logoColor=ffffff)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-000000?style=for-the-badge&logo=tailwind-css&logoColor=ffffff)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-000000?style=for-the-badge&logo=framer&logoColor=ffffff)](https://www.framer.com/motion/)
[![React Router](https://img.shields.io/badge/React_Router-000000?style=for-the-badge&logo=react-router&logoColor=ffffff)](https://reactrouter.com/)
[![Redux](https://img.shields.io/badge/Redux_Toolkit-000000?style=for-the-badge&logo=redux&logoColor=ffffff)](https://redux-toolkit.js.org/)
[![ESLint](https://img.shields.io/badge/ESLint-000000?style=for-the-badge&logo=eslint&logoColor=ffffff)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/Prettier-000000?style=for-the-badge&logo=prettier&logoColor=ffffff)](https://prettier.io/)

</div>

---

## ¿Qué es Agilens?

Agilens es una **web app de notas técnicas para desarrolladores** pensada para el entorno ágil y Scrum. No es un editor de texto genérico ni una wiki corporativa. Es tu espacio de trabajo personal donde:

- Documentas lo que hiciste **con evidencia real**: código, capturas, videos y funciones.
- Preparas tus **dailys en segundos** con notas organizadas por sprint, tarea o fecha.
- Generas **documentación técnica** directamente desde fragmentos de código.
- Versionas todo con **Git puro**, sin servidores, sin bases de datos, sin suscripciones.
- Sincronizas con **GitHub** cuando lo necesites, en un clic.

Todo funciona desde el navegador. Sin instalar nada. Sin depender de servicios externos.

---

## Funcionalidades principales

### 📝 Dev Notes — Notas técnicas con contexto

Editor nativo Markdown con previsualización en vivo. Escribe tus notas como lo harías en código: rápido, estructurado y sin ruido visual.

- **Live Preview:** Escribe y ve el resultado renderizado en tiempo real, lado a lado.
- **Bloques de código con sintaxis:** Soporte completo para múltiples lenguajes con resaltado (`highlight.js` / `shiki`).
- **Embeds de funciones:** Pega una función y Agilens la formatea, la documenta y la muestra lista para compartir.
- **Evidencias multimedia:** Adjunta imágenes (capturas de pantalla, diagramas) y videos directamente en tus notas. Sin subir a ningún servicio.
- **Etiquetas y organización:** Organiza por sprint, épica, tarea o fecha. Busca instantáneamente entre todas tus notas.

### 🤖 Generación de documentación desde código

Pega cualquier fragmento de código y Agilens genera automáticamente:

- Descripción de la función y sus parámetros.
- Ejemplos de uso.
- Notas de implementación.
- Bloque Markdown listo para copiar o versionar.

Sin APIs externas. El procesamiento ocurre localmente en el navegador.

### 📋 Daily Standup — Preparado en segundos

Un módulo dedicado para tus reuniones diarias de Scrum:

- **Registro por día:** Cada nota se timestampea automáticamente y se agrupa por fecha.
- **Formato daily:** Vista estructurada en "Hice / Haré / Bloqueos" generada desde tus notas del día.
- **Historial de sprints:** Navega hacia atrás en el tiempo para ver qué hiciste en cada sprint.
- **Exportación rápida:** Copia el resumen del daily listo para pegar en Slack, Teams o tu herramienta de gestión.

### 🔀 Git Nativo — Versionado sin servidores

Agilens incorpora un motor Git mejorado que funciona directamente sobre el sistema de archivos local mediante la **File System Access API** del navegador.

- **Commits locales:** Versiona tus notas con mensajes de commit descriptivos.
- **Historial visual:** Navega el historial de cambios de cualquier nota con un diff claro.
- **Branches y etiquetas:** Crea ramas por sprint o feature para mantener el contexto separado.
- **Sin servidor, sin daemon:** Git puro corriendo en el navegador, con `isomorphic-git`.

### ☁️ Integración con GitHub

Conecta tu repositorio de GitHub y lleva tus notas a la nube cuando quieras:

- **Push / Pull directo:** Sincroniza tus notas con un repositorio remoto en un clic.
- **Autenticación por token:** Configura tu Personal Access Token una sola vez. Sin OAuth, sin redirects.
- **Publicar como GitHub Pages:** Convierte tu colección de notas en un sitio estático publicado automáticamente.
- **Abrir en GitHub:** Enlace directo al archivo o commit en el repositorio remoto.

### 📤 Exportación y portabilidad

Tus notas siempre son tuyas y en formatos abiertos:

- **Descargar como `.md`:** Exporta cualquier nota como archivo Markdown puro.
- **Exportar colección como `.zip`:** Descarga todas tus notas en un archivo comprimido listo para abrir en cualquier editor.
- **Exportar como PDF:** Renderiza la nota con su estilo y genera un PDF para compartir.
- **Importar desde archivos `.md`:** Arrastra tus Markdown existentes y se integran al instante.

---

## Filosofía de diseño

| Principio            | Aplicación en Agilens                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **Zero Backend**     | Sin base de datos, sin servidor propio. Tu local storage y el sistema de archivos son suficientes. |
| **Markdown First**   | Todo es Markdown. Lo que escribes es lo que se versiona, lo que se exporta, lo que se publica.     |
| **Developer Native** | Diseñado por y para devs. Atajos de teclado, modo oscuro por defecto, fuentes monoespaciadas.      |
| **Offline First**    | Funciona sin conexión. La red es opcional, no un requisito.                                        |
| **No Lock-in**       | Tus notas son archivos `.md` planos. Agilens es el visor y el motor, no el dueño de tus datos.     |

---

## Stack tecnológico

| Categoría           | Tecnología                      | Rol                                           |
| ------------------- | ------------------------------- | --------------------------------------------- |
| Framework           | React 19 + TypeScript           | UI reactiva y tipado estricto                 |
| Build               | Vite                            | Desarrollo ultrarrápido y bundles optimizados |
| Estilos             | Tailwind CSS                    | Sistema de diseño utilitario y consistente    |
| Animaciones         | Framer Motion                   | Transiciones fluidas entre vistas y estados   |
| Estado global       | Redux Toolkit                   | Gestión del estado de notas, git y UI         |
| Navegación          | React Router                    | Rutas por nota, sprint y vista                |
| Markdown            | `unified` / `remark` / `rehype` | Pipeline de procesamiento Markdown nativo     |
| Resaltado           | `shiki`                         | Syntax highlighting con temas de VS Code      |
| Git en el navegador | `isomorphic-git`                | Motor Git completo sin servidor               |
| File System         | File System Access API          | Acceso nativo al sistema de archivos local    |
| GitHub API          | GitHub REST API v3              | Push, pull y gestión de repositorios          |

---

## Casos de uso

```
👨‍💻 Termino de implementar una feature.
   → Abro Agilens, pego el código, genero la doc, adjunto la captura del test pasando.
   → Commit local: "feat: implementado endpoint de autenticación"
   → Listo para el daily de mañana.
```

```
🗣️ Son las 9:55 AM, el daily es en 5 minutos.
   → Abro la vista Daily de Agilens.
   → Veo todo lo que registré ayer con contexto real.
   → Copio el resumen y lo pego en el canal de Slack.
   → Entro al daily con claridad absoluta.
```

```
📤 Quiero compartir mi progreso del sprint con el equipo.
   → Git push a mi repositorio de GitHub con las notas del sprint.
   → El equipo puede ver el historial completo con diffs y evidencias.
```

---

## Roadmap

- [x] Editor Markdown con live preview
- [x] Bloques de código con syntax highlighting
- [x] Adjuntar imágenes y videos en notas
- [x] Generación de documentación desde código
- [x] Vista Daily Standup
- [x] Motor Git local con `isomorphic-git`
- [x] Integración con GitHub (push / pull)
- [x] Exportación a PDF y ZIP
- [x] Publicación como GitHub Pages
- [x] Modo presentación para mostrar notas en reuniones

---

## Desarrollo local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/agilens.git
cd agilens

# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

```bash
# Build de producción
npm run build

# Preview del build
npm run preview
```

---

> **Agilens no te pide que cambies cómo trabajas.**  
> Se adapta a tu flujo como desarrollador y lo hace visible para tu equipo.
