/**
 * ProjectBadge — muestra el nombre y color de un proyecto en línea.
 * Reutilizable en notas, sprints, impedimentos, daily, etc.
 */
import { useAppSelector } from '@/store'
import { ProjectIcon } from '@/lib/projectIcons'

interface Props {
  projectId: string
  size?: 'sm' | 'md'
  /** Si true muestra un "×" para quitar el vínculo */
  onRemove?: () => void
  onClick?: () => void
}

export default function ProjectBadge({ projectId, size = 'sm', onRemove, onClick }: Props) {
  const project = useAppSelector(s => s.projects.projects.find(p => p.id === projectId))
  if (!project) return null

  const h = size === 'sm' ? '20px' : '24px'
  const fs = size === 'sm' ? '11px' : '12px'
  const iconSz = size === 'sm' ? 11 : 13

  return (
    <span
      onClick={onClick}
      title={project.description ?? project.name}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        height: h,
        padding: '0 7px',
        borderRadius: '99px',
        background: project.color + '22',
        border: `1px solid ${project.color}55`,
        color: project.color,
        fontSize: fs,
        fontWeight: 600,
        lineHeight: 1,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <ProjectIcon icon={project.icon} size={iconSz} color={project.color} />
      {project.name}
      {onRemove && (
        <span
          onClick={e => {
            e.stopPropagation()
            onRemove()
          }}
          style={{
            marginLeft: '2px',
            opacity: 0.7,
            cursor: 'pointer',
            lineHeight: 1,
            fontSize: '10px',
          }}
        >
          ×
        </span>
      )}
    </span>
  )
}
