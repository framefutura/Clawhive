import React, { useState, useMemo } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Gene, GeneCategory } from '../types'

interface GenePickerProps {
  availableGenes: Gene[]
  selectedGenes: string[]
  onChange: (geneIds: string[]) => void
  className?: string
}

const CATEGORY_INFO: Record<GeneCategory, { name: string; icon: string; color: string }> = {
  dev: { name: 'Development', icon: '>>', color: '#10B981' },
  data: { name: 'Data', icon: '#', color: '#3B82F6' },
  ops: { name: 'Operations', icon: '*', color: '#F59E0B' },
  network: { name: 'Network', icon: '@', color: '#8B5CF6' },
  creative: { name: 'Creative', icon: '~', color: '#EC4899' },
  comm: { name: 'Communication', icon: '>', color: '#06B6D4' },
  security: { name: 'Security', icon: '!', color: '#EF4444' },
  efficiency: { name: 'Efficiency', icon: '^', color: '#84CC16' },
}

export function GenePicker({ availableGenes, selectedGenes, onChange, className }: GenePickerProps) {
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<GeneCategory>>(new Set())

  // Group genes by category
  const genesByCategory = useMemo(() => {
    const grouped = new Map<GeneCategory, Gene[]>()
    for (const gene of availableGenes) {
      if (!grouped.has(gene.category)) {
        grouped.set(gene.category, [])
      }
      grouped.get(gene.category)!.push(gene)
    }
    return grouped
  }, [availableGenes])

  // Filter genes by search
  const filteredGenes = useMemo(() => {
    if (!search.trim()) return availableGenes
    const lower = search.toLowerCase()
    return availableGenes.filter(
      g =>
        g.name.toLowerCase().includes(lower) ||
        g.description.toLowerCase().includes(lower) ||
        CATEGORY_INFO[g.category].name.toLowerCase().includes(lower)
    )
  }, [availableGenes, search])

  const toggleGene = (geneId: string) => {
    if (selectedGenes.includes(geneId)) {
      onChange(selectedGenes.filter(id => id !== geneId))
    } else {
      onChange([...selectedGenes, geneId])
    }
  }

  const toggleCategory = (category: GeneCategory) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const selectAllInCategory = (category: GeneCategory) => {
    const categoryGenes = genesByCategory.get(category) || []
    const categoryGeneIds = categoryGenes.map(g => g.id)
    const allSelected = categoryGeneIds.every(id => selectedGenes.includes(id))

    if (allSelected) {
      onChange(selectedGenes.filter(id => !categoryGeneIds.includes(id)))
    } else {
      onChange([...new Set([...selectedGenes, ...categoryGeneIds])])
    }
  }

  const selectedCount = selectedGenes.length

  return (
    <div className={cn("border rounded-lg bg-card", className)}>
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-sm">Load Genes (Choose capabilities)</h3>
          <span className="text-xs text-muted-foreground">
            {selectedCount} selected
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search genes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {/* Selected Genes Summary */}
      {selectedCount > 0 && (
        <div className="px-3 py-2 bg-muted/50 border-b">
          <div className="flex flex-wrap gap-1">
            {selectedGenes.map(geneId => {
              const gene = availableGenes.find(g => g.id === geneId)
              if (!gene) return null
              const info = CATEGORY_INFO[gene.category]
              return (
                <button
                  key={geneId}
                  onClick={() => toggleGene(geneId)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${info.color}20`,
                    color: info.color,
                  }}
                >
                  <span>{info.icon}</span>
                  <span>{gene.name}</span>
                  <span className="opacity-60">x</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Gene List */}
      <ScrollArea className="h-[300px]">
        {search.trim() ? (
          // Search results - flat list
          <div className="p-2 space-y-1">
            {filteredGenes.map(gene => {
              const info = CATEGORY_INFO[gene.category]
              const isSelected = selectedGenes.includes(gene.id)
              return (
                <button
                  key={gene.id}
                  onClick={() => toggleGene(gene.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                    isSelected ? "bg-primary/10" : "hover:bg-muted"
                  )}
                >
                  <span className="text-lg">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{gene.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{gene.description}</div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              )
            })}
          </div>
        ) : (
          // Category view
          <div className="p-2 space-y-2">
            {Array.from(genesByCategory.entries()).map(([category, genes]) => {
              const info = CATEGORY_INFO[category]
              const isExpanded = expandedCategories.has(category)
              const selectedInCategory = genes.filter(g => selectedGenes.includes(g.id)).length

              return (
                <div key={category} className="border rounded-md overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-2 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{info.icon}</span>
                      <span className="font-medium text-sm">{info.name}</span>
                      {selectedInCategory > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: `${info.color}20`, color: info.color }}
                        >
                          {selectedInCategory}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="p-1 space-y-0.5">
                      <button
                        onClick={() => selectAllInCategory(category)}
                        className="w-full text-left px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {selectedInCategory === genes.length ? 'Deselect all' : 'Select all'}
                      </button>
                      {genes.map(gene => {
                        const isSelected = selectedGenes.includes(gene.id)
                        return (
                          <button
                            key={gene.id}
                            onClick={() => toggleGene(gene.id)}
                            className={cn(
                              "w-full flex items-center gap-2 p-2 rounded text-left transition-colors",
                              isSelected ? "bg-primary/10" : "hover:bg-muted"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm truncate">{gene.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{gene.description}</div>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
