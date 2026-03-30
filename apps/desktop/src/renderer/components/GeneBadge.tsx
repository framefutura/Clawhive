import React from 'react'
import { cn } from '@/lib/utils'
import type { GeneCategory } from '../types'

interface GeneBadgeProps {
  category: GeneCategory
  name: string
  count?: number
  size?: 'sm' | 'md'
  className?: string
}

const CATEGORY_STYLES: Record<GeneCategory, { bg: string; text: string; icon: string }> = {
  dev: {
    bg: 'bg-gene-dev/15',
    text: 'text-gene-dev',
    icon: '>>',
  },
  data: {
    bg: 'bg-gene-data/15',
    text: 'text-gene-data',
    icon: '#',
  },
  ops: {
    bg: 'bg-gene-ops/15',
    text: 'text-gene-ops',
    icon: '*',
  },
  network: {
    bg: 'bg-gene-network/15',
    text: 'text-gene-network',
    icon: '@',
  },
  creative: {
    bg: 'bg-gene-creative/15',
    text: 'text-gene-creative',
    icon: '~',
  },
  comm: {
    bg: 'bg-gene-comm/15',
    text: 'text-gene-comm',
    icon: '>',
  },
  security: {
    bg: 'bg-gene-security/15',
    text: 'text-gene-security',
    icon: '!',
  },
  efficiency: {
    bg: 'bg-gene-efficiency/15',
    text: 'text-gene-efficiency',
    icon: '^',
  },
}

export function GeneBadge({ category, name, count, size = 'md', className }: GeneBadgeProps) {
  const styles = CATEGORY_STYLES[category]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        styles.bg,
        styles.text,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className
      )}
      title={`${name} (${category})`}
    >
      <span>{styles.icon}</span>
      <span className="truncate max-w-[100px]">{name}</span>
      {count !== undefined && count > 1 && (
        <span className="opacity-60">x{count}</span>
      )}
    </span>
  )
}

interface GeneBadgeGroupProps {
  genes: { category: GeneCategory; name: string }[]
  maxVisible?: number
  size?: 'sm' | 'md'
}

export function GeneBadgeGroup({ genes, maxVisible = 4, size = 'sm' }: GeneBadgeGroupProps) {
  const visible = genes.slice(0, maxVisible)
  const remaining = genes.length - maxVisible

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((gene, i) => (
        <GeneBadge
          key={i}
          category={gene.category}
          name={gene.name}
          size={size}
        />
      ))}
      {remaining > 0 && (
        <span className={cn(
          "inline-flex items-center rounded-full bg-muted text-muted-foreground",
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        )}>
          +{remaining}
        </span>
      )}
    </div>
  )
}
