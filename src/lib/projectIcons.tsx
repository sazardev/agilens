/**
 * Inline SVG icon set for Projects.
 * Each icon is a tiny 16×16 SVG component — no external deps.
 */
import type { ReactElement } from 'react'
import type { ProjectIconName } from '@/types'

interface IconProps {
  size?: number
  color?: string
}

function icon(paths: React.ReactNode, size: number, color?: string) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths}
    </svg>
  )
}

export function IcoCode({ size = 16, color }: IconProps) {
  return icon(
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>,
    size,
    color
  )
}

export function IcoGlobe({ size = 16, color }: IconProps) {
  return icon(
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>,
    size,
    color
  )
}

export function IcoServer({ size = 16, color }: IconProps) {
  return icon(
    <>
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </>,
    size,
    color
  )
}

export function IcoDatabase({ size = 16, color }: IconProps) {
  return icon(
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </>,
    size,
    color
  )
}

export function IcoMobile({ size = 16, color }: IconProps) {
  return icon(
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </>,
    size,
    color
  )
}

export function IcoDesktop({ size = 16, color }: IconProps) {
  return icon(
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </>,
    size,
    color
  )
}

export function IcoApi({ size = 16, color }: IconProps) {
  return icon(
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="11" y2="17" />
    </>,
    size,
    color
  )
}

export function IcoCloud({ size = 16, color }: IconProps) {
  return icon(<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />, size, color)
}

export function IcoShield({ size = 16, color }: IconProps) {
  return icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, size, color)
}

export function IcoTool({ size = 16, color }: IconProps) {
  return icon(
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />,
    size,
    color
  )
}

export function IcoStar({ size = 16, color }: IconProps) {
  return icon(
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
    size,
    color
  )
}

export function IcoFlame({ size = 16, color }: IconProps) {
  return icon(
    <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z" />,
    size,
    color
  )
}

export function IcoBrain({ size = 16, color }: IconProps) {
  return icon(
    <>
      <path d="M9.5 2A2.5 2.5 0 017 4.5v0A2.5 2.5 0 014.5 7v0A2.5 2.5 0 017 9.5v0A2.5 2.5 0 019.5 12v0" />
      <path d="M14.5 2A2.5 2.5 0 0117 4.5v0A2.5 2.5 0 0119.5 7v0A2.5 2.5 0 0117 9.5v0A2.5 2.5 0 0114.5 12v0" />
      <path d="M12 12v10" />
      <path d="M9.5 22h5" />
    </>,
    size,
    color
  )
}

export function IcoPackage({ size = 16, color }: IconProps) {
  return icon(
    <>
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </>,
    size,
    color
  )
}

export function IcoLayers({ size = 16, color }: IconProps) {
  return icon(
    <>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </>,
    size,
    color
  )
}

export function IcoTerminal({ size = 16, color }: IconProps) {
  return icon(
    <>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </>,
    size,
    color
  )
}

// ─── Lookup map ───────────────────────────────────────────────────────────────

export const PROJECT_ICON_COMPONENTS: Record<ProjectIconName, (props: IconProps) => ReactElement> =
  {
    code: IcoCode,
    globe: IcoGlobe,
    server: IcoServer,
    database: IcoDatabase,
    mobile: IcoMobile,
    desktop: IcoDesktop,
    api: IcoApi,
    cloud: IcoCloud,
    shield: IcoShield,
    tool: IcoTool,
    star: IcoStar,
    flame: IcoFlame,
    brain: IcoBrain,
    package: IcoPackage,
    layers: IcoLayers,
    terminal: IcoTerminal,
  }

export const PROJECT_ICON_LABELS: Record<ProjectIconName, string> = {
  code: 'Código',
  globe: 'Web',
  server: 'Servidor',
  database: 'Base de datos',
  mobile: 'Móvil',
  desktop: 'Desktop',
  api: 'API',
  cloud: 'Cloud',
  shield: 'Seguridad',
  tool: 'Herramienta',
  star: 'Destacado',
  flame: 'Hot',
  brain: 'IA / ML',
  package: 'Librería',
  layers: 'Full-stack',
  terminal: 'CLI',
}

export function ProjectIcon({
  icon,
  size = 16,
  color,
}: {
  icon: ProjectIconName
  size?: number
  color?: string
}) {
  const Comp = PROJECT_ICON_COMPONENTS[icon]
  return <Comp size={size} color={color} />
}
