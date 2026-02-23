/**
 * SVG icon components for each NoteType — no emojis.
 * Import these instead of NOTE_TYPE_META[type].icon.
 */
import type { JSX } from 'react'
import type { NoteType } from '@/types'

export const IconTypeNote = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)
export const IconTypeDaily = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
export const IconTypeEvidence = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
)
export const IconTypeTechnical = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
)
export const IconTypeMeeting = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
)
export const IconTypeSprint = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <polyline points="13 17 18 12 13 7" />
    <polyline points="6 17 11 12 6 7" />
  </svg>
)
export const IconTypeTask = () => (
  <svg
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    viewBox="0 0 24 24"
  >
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
)

/** Lookup map: NoteType → icon component */
export const NOTE_TYPE_ICONS: Record<NoteType, () => JSX.Element> = {
  note: IconTypeNote,
  daily: IconTypeDaily,
  evidence: IconTypeEvidence,
  technical: IconTypeTechnical,
  meeting: IconTypeMeeting,
  sprint: IconTypeSprint,
  task: IconTypeTask,
}

/** Renders the correct SVG icon for any NoteType */
export function NoteTypeIcon({ type, size = 13 }: { type: NoteType; size?: number }) {
  const icons: Record<NoteType, JSX.Element> = {
    note: (
      <svg
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    daily: (
      <svg
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    evidence: (
      <svg
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
      </svg>
    ),
    technical: (
      <svg
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    meeting: (
      <svg
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    sprint: (
      <svg
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <polyline points="13 17 18 12 13 7" />
        <polyline points="6 17 11 12 6 7" />
      </svg>
    ),
    task: (
      <svg
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  }
  return icons[type] ?? icons.note
}
