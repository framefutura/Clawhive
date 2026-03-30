import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface BlackboardCardProps {
  title: string
  icon?: React.ReactNode
  status?: 'idle' | 'working' | 'completed' | 'error'
  metric?: string | number
  metricLabel?: string
  action?: {
    label: string
    onClick: () => void
  }
  children?: React.ReactNode
  className?: string
}

const statusColors = {
  idle: 'border-muted-foreground/20',
  working: 'border-primary animate-pulse',
  completed: 'border-green-500',
  error: 'border-destructive',
}

const statusDots = {
  idle: 'bg-muted-foreground',
  working: 'bg-primary',
  completed: 'bg-green-500',
  error: 'bg-destructive',
}

export function BlackboardCard({
  title,
  icon,
  status = 'idle',
  metric,
  metricLabel,
  action,
  children,
  className,
}: BlackboardCardProps) {
  return (
    <div
      className={cn(
        "boundary-panel p-4 flex flex-col gap-3",
        statusColors[status],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h3 className="font-medium text-sm">{title}</h3>
        </div>
        <span className={cn("w-2 h-2 rounded-full", statusDots[status])} />
      </div>

      {metric !== undefined && (
        <div className="space-y-0.5">
          <div className="text-2xl font-semibold">{metric}</div>
          {metricLabel && <div className="text-xs text-muted-foreground">{metricLabel}</div>}
        </div>
      )}

      {children && <div className="text-sm text-muted-foreground">{children}</div>}

      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick} className="w-full mt-auto">
          {action.label}
        </Button>
      )}
    </div>
  )
}
