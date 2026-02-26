import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { nanoid } from 'nanoid'
import type { NoteTemplate, NoteType } from '@/types'

// ─── Built-in templates ───────────────────────────────────────────────────────

export const BUILTIN_TEMPLATES: NoteTemplate[] = [
  {
    id: 'tpl-note',
    name: 'Nota general',
    type: 'note',
    isBuiltin: true,
    content: '# {{title}}\n\n',
  },
  {
    id: 'tpl-daily',
    name: 'Daily standup',
    type: 'daily',
    isBuiltin: true,
    content:
      '# Daily {{date}}\n\n## ✅ Hice hoy\n\n- \n\n## 🔜 Haré mañana\n\n- \n\n## 🚫 Bloqueado\n\n- \n',
  },
  {
    id: 'tpl-evidence',
    name: 'Evidencia',
    type: 'evidence',
    isBuiltin: true,
    content:
      '# Evidencia: {{title}}\n\n**Fecha:** {{date}}\n\n## Descripción\n\n\n\n## Capturas / Archivos\n\n\n\n## Conclusión\n\n',
  },
  {
    id: 'tpl-technical',
    name: 'Nota técnica',
    type: 'technical',
    isBuiltin: true,
    content:
      '# {{title}}\n\n## Contexto\n\n\n\n## Solución / Decisión\n\n\n\n## Código\n\n```typescript\n\n```\n\n## Referencias\n\n- \n',
  },
  {
    id: 'tpl-meeting',
    name: 'Reunión',
    type: 'meeting',
    isBuiltin: true,
    content:
      '# Reunión: {{title}}\n\n**Fecha:** {{date}}  \n**Asistentes:** \n\n## Agenda\n\n1. \n\n## Notas\n\n\n\n## Acciones\n\n- [ ] \n',
  },
  {
    id: 'tpl-sprint',
    name: 'Sprint',
    type: 'sprint',
    isBuiltin: true,
    content:
      '# Sprint: {{title}}\n\n**Inicio:**  \n**Fin:**  \n**Objetivo:**\n\n## Backlog\n\n- [ ] \n\n## Retrospectiva\n\n### ✅ Qué salió bien\n\n### ❌ Qué mejorar\n\n### 🔧 Acciones\n\n',
  },
  {
    id: 'tpl-task',
    name: 'Tarea',
    type: 'task',
    isBuiltin: true,
    content:
      '# Tarea: {{title}}\n\n**Prioridad:** Media  \n**Sprint:** \n\n## Descripción\n\n\n\n## Criterios de aceptación\n\n- [ ] \n\n## Notas\n\n',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Expand {{title}} and {{date}} placeholders in a template */
export function expandTemplate(content: string, title: string): string {
  const date = new Date().toLocaleDateString('es', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return content.replace(/\{\{title\}\}/g, title).replace(/\{\{date\}\}/g, date)
}

/** Get the default template for a given note type */
export function getDefaultForType(
  templates: NoteTemplate[],
  type: NoteType,
  defaultId: string
): NoteTemplate {
  // If overridden default exists and matches type, prefer it
  const overridden = templates.find(t => t.id === defaultId)
  if (overridden && overridden.type === type) return overridden
  // Otherwise find builtin for that type
  const builtin = BUILTIN_TEMPLATES.find(t => t.type === type)
  return builtin ?? BUILTIN_TEMPLATES[0]
}

// ─── State ────────────────────────────────────────────────────────────────────

interface TemplatesState {
  templates: NoteTemplate[]
  defaultTemplateId: string
}

const initialState: TemplatesState = {
  templates: BUILTIN_TEMPLATES,
  defaultTemplateId: 'tpl-note',
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    addTemplate(state, action: PayloadAction<Omit<NoteTemplate, 'id'>>) {
      state.templates.push({ ...action.payload, id: nanoid(), isBuiltin: false })
    },
    updateTemplate(state, action: PayloadAction<Partial<NoteTemplate> & { id: string }>) {
      const idx = state.templates.findIndex(t => t.id === action.payload.id)
      if (idx !== -1) state.templates[idx] = { ...state.templates[idx], ...action.payload }
    },
    deleteTemplate(state, action: PayloadAction<string>) {
      const tpl = state.templates.find(t => t.id === action.payload)
      if (tpl?.isBuiltin) return // cannot delete builtins
      state.templates = state.templates.filter(t => t.id !== action.payload)
      if (state.defaultTemplateId === action.payload) state.defaultTemplateId = 'tpl-note'
    },
    setDefaultTemplate(state, action: PayloadAction<string>) {
      if (state.templates.some(t => t.id === action.payload)) {
        state.defaultTemplateId = action.payload
      }
    },
    resetToBuiltins(state) {
      state.templates = BUILTIN_TEMPLATES
      state.defaultTemplateId = 'tpl-note'
    },
    /** Restore custom templates from a git clone/pull, always preserving builtins */
    restoreTemplates(
      state,
      action: PayloadAction<{ templates: NoteTemplate[]; defaultTemplateId: string }>
    ) {
      const userTemplates = action.payload.templates.filter(t => !t.isBuiltin)
      const builtinIds = new Set(BUILTIN_TEMPLATES.map(t => t.id))
      const filteredUser = userTemplates.filter(t => !builtinIds.has(t.id))
      state.templates = [...BUILTIN_TEMPLATES, ...filteredUser]
      state.defaultTemplateId = action.payload.defaultTemplateId || 'tpl-note'
    },
  },
})

export const {
  addTemplate,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate,
  resetToBuiltins,
  restoreTemplates,
} = templatesSlice.actions

export default templatesSlice.reducer
