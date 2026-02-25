# Security Policy — Política de Seguridad

## English

### Supported Versions

| Version | Supported       |
| ------- | --------------- |
| 0.2.x   | ✅ Yes          |
| 0.1.x   | ⚠️ Patches only |
| < 0.1   | ❌ No           |

### What Agilens Stores and Where

Understanding the data model helps identify the security surface:

| Data                              | Storage                                    | Notes                                   |
| --------------------------------- | ------------------------------------------ | --------------------------------------- |
| Notes, settings, metadata         | `localStorage` (serialized Redux state)    | Stored locally in the browser           |
| Attachment blobs (images)         | `IndexedDB`                                | Local browser database                  |
| Note files, `agilens.config.json` | LightningFS (IndexedDB-backed virtual FS)  | Managed by isomorphic-git               |
| GitHub token                      | `localStorage` (settings slice)            | **Never** written to git or config file |
| Lock password hash                | SHA-256 (one-way) — stored in config + git | Hash only; plain text never stored      |

### Reporting a Vulnerability

**Do NOT open a public Issue for security vulnerabilities.**

Please report security issues privately via one of these channels:

1. **GitHub Security Advisories** — go to the repository → Security → Report a vulnerability.
2. **Email** — contact the maintainer directly (see profile).

#### What to include

- Description of the vulnerability and potential impact
- Steps to reproduce (detailed, minimal)
- Browser, OS, and Agilens version
- Any proof-of-concept or screenshots (redact sensitive data)

#### Response time

We aim to acknowledge reports within **72 hours** and provide a resolution or mitigation plan within **14 days** for confirmed vulnerabilities.

### Scope

Issues considered in scope:

- Data leakage (notes, settings, token) to third parties
- Cross-site scripting (XSS) via Markdown rendering or note content
- Unauthorized access to the lock screen bypass
- Exposure of the GitHub token in unexpected places (logs, network, git history)

Issues considered out of scope:

- Vulnerabilities in browser storage itself (localStorage/IndexedDB) — this is a browser responsibility
- Social engineering attacks
- Physical device access

### Responsible Disclosure

We follow coordinated disclosure: we ask reporters to give us reasonable time to fix the issue before publishing details publicly. We will credit reporters in the release notes unless anonymity is requested.

---

## Español

### Versiones con Soporte

| Versión | Con soporte     |
| ------- | --------------- |
| 0.2.x   | ✅ Sí           |
| 0.1.x   | ⚠️ Solo parches |
| < 0.1   | ❌ No           |

### Qué Almacena Agilens y Dónde

| Dato                                     | Almacenamiento                                      | Notas                                                  |
| ---------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Notas, configuración, metadata           | `localStorage` (estado Redux)                       | Almacenado localmente en el navegador                  |
| Blobs de adjuntos (imágenes)             | `IndexedDB`                                         | Base de datos local del navegador                      |
| Archivos de notas, `agilens.config.json` | LightningFS (virtual FS sobre IndexedDB)            | Gestionado por isomorphic-git                          |
| Token de GitHub                          | `localStorage` (settings slice)                     | **Nunca** se escribe en git ni en el archivo de config |
| Hash de contraseña de bloqueo            | SHA-256 (unidireccional) — guardado en config + git | Solo el hash; el texto plano nunca se almacena         |

### Reportar una Vulnerabilidad

**NO abrir un Issue público para vulnerabilidades de seguridad.**

Por favor reporta problemas de seguridad de forma privada a través de uno de estos canales:

1. **GitHub Security Advisories** — ir al repositorio → Security → Report a vulnerability.
2. **Email** — contactar directamente al mantenedor (ver perfil de GitHub).

#### Qué incluir

- Descripción de la vulnerabilidad y el impacto potencial
- Pasos para reproducir (detallados, mínimos)
- Navegador, OS y versión de Agilens
- Prueba de concepto o capturas de pantalla (ocultar datos sensibles)

#### Tiempo de respuesta

Buscamos acusar recibo en **72 horas** y proporcionar un plan de resolución o mitigación en **14 días** para vulnerabilidades confirmadas.

### Divulgación Responsable

Seguimos la divulgación coordinada: pedimos a los reportadores que nos den tiempo razonable para corregir el problema antes de publicar los detalles. Daremos crédito en las notas de versión a menos que se solicite anonimato.
