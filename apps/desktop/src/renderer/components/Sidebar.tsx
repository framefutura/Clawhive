import React from 'react'
import { Plus, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { GeneCategory } from '../types'

interface Agent {
  id: string
  name: string
  role: string
  status: 'idle' | 'working' | 'offline'
  geneCount: number
}

interface SidebarProps {
  agents: Agent[]
  activeAgentId: string | null
  onSelectAgent: (id: string) => void
  onCreateAgent: () => void
  geneCategories: { id: GeneCategory; name: string; color: string; count: number }[]
}

const statusColors = {
  idle: 'bg-green-500',
  working: 'bg-yellow-500',
  offline: 'bg-muted-foreground',
}

export function Sidebar({
  agents,
  activeAgentId,
  onSelectAgent,
  onCreateAgent,
  geneCategories,
}: SidebarProps) {
  return (
    <div className="w-[240px] h-full border-r bg-card flex flex-col">
      {/* Team Section */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Team</h3>
          <button
            onClick={onCreateAgent}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Create new agent"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {agents.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">
                No agents yet
              </div>
            )}
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                  activeAgentId === agent.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-card",
                      statusColors[agent.status]
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{agent.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{agent.role}</div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Genes Section */}
      <div className="p-3 flex-1">
        <h3 className="font-semibold text-sm mb-2">Genes</h3>
        <ScrollArea className="h-full">
          <div className="space-y-1">
            {geneCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm">{category.name}</span>
                </div>
                {category.count > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {category.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* New Agent Button */}
      <div className="p-3 border-t">
        <button
          onClick={onCreateAgent}
          className="w-full flex items-center justify-center gap-2 p-2 border rounded-md hover:bg-muted transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New Agent
        </button>
      </div>
    </div>
  )
}
