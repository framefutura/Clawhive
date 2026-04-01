import React from 'react'
import { Bot, Dna, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentRecord } from '../../common/agent'

interface AgentCardProps {
  agent: AgentRecord
  isActive?: boolean
  onClick?: () => void
}

const roleBadgeColors: Record<string, string> = {
  CEO: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  CFO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  COO: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  'Department Head': 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200',
  'Team Leader': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200',
  'Individual Agent': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

export function AgentCard({ agent, isActive, onClick }: AgentCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-colors',
        isActive
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:bg-muted'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-medium truncate">{agent.name}</h4>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap',
                roleBadgeColors[agent.role] || 'bg-muted text-muted-foreground'
              )}
            >
              {agent.role}
            </span>
          </div>

          {agent.department && (
            <p className="text-xs text-muted-foreground truncate">
              {agent.department}
              {agent.team && ` · ${agent.team}`}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-muted-foreground">
            <div className="flex items-center gap-1 text-xs">
              <Dna className="w-3 h-3" />
              {agent.genes.length} genes
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Shield className="w-3 h-3" />
              {agent.defaultSecurityLevel}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
