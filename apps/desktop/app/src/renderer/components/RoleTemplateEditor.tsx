import React, { useState, useEffect, useCallback } from 'react'
import { FileText, Pencil, X, Save, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentRole } from '../../common/agent'

const PREDEFINED_ROLES: AgentRole[] = [
  'CEO',
  'CFO',
  'COO',
  'Department Head',
  'Team Leader',
  'Individual Agent',
  'Secretary',
]

const DOC_FILES = ['soul.md', 'heartbeat.md', 'tools.md', 'agents.md', 'interaction.md'] as const

export interface RoleTemplateDoc {
  role: AgentRole
  docName: string
  content: string
}

export interface RoleTemplate {
  role: AgentRole
  docs: Record<string, string>
}

export function RoleTemplateEditor() {
  const [templates, setTemplates] = useState<RoleTemplate[]>([])
  const [expandedRole, setExpandedRole] = useState<AgentRole | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [docDraft, setDocDraft] = useState('')

  // Load templates via IPC
  const loadTemplates = useCallback(async () => {
    try {
      const loaded = await window.clawhive.listRoleTemplates()
      setTemplates(loaded)
    } catch (err) {
      // Fallback: generate empty templates for all roles
      setTemplates(
        PREDEFINED_ROLES.map((role) => ({
          role,
          docs: Object.fromEntries(DOC_FILES.map((d) => [d, ''])),
        }))
      )
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const toggleRole = (role: AgentRole) => {
    setExpandedRole((prev) => (prev === role ? null : role))
    setEditingKey(null)
    setDocDraft('')
  }

  const makeKey = (role: AgentRole, docName: string) => `${role}::${docName}`

  const handleStartEdit = (role: AgentRole, docName: string) => {
    const template = templates.find((t) => t.role === role)
    setDocDraft(template?.docs[docName] || '')
    setEditingKey(makeKey(role, docName))
  }

  const handleCancelEdit = () => {
    setEditingKey(null)
    setDocDraft('')
  }

  const handleSaveEdit = async (role: AgentRole, docName: string) => {
    try {
      await window.clawhive.updateRoleTemplate(role, docName, docDraft)
      // Update local state
      setTemplates((prev) =>
        prev.map((t) =>
          t.role === role ? { ...t, docs: { ...t.docs, [docName]: docDraft } } : t
        )
      )
    } catch (err) {
      console.error('Failed to save role template doc:', err)
    }
    setEditingKey(null)
    setDocDraft('')
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">Role Templates</div>
      <p className="text-xs text-muted-foreground">
        Edit default docs for each predefined role. Changes apply to new agents using that role.
      </p>

      <div className="space-y-1">
        {PREDEFINED_ROLES.map((role) => {
          const isExpanded = expandedRole === role
          return (
            <div key={role} className="rounded border">
              <button
                type="button"
                className="flex w-full items-center gap-2 p-2 text-sm hover:bg-muted transition-colors"
                onClick={() => toggleRole(role)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="font-medium">{role}</span>
              </button>

              {isExpanded && (
                <div className="border-t px-2 pb-2 space-y-1.5 pt-1.5">
                  {DOC_FILES.map((docName) => {
                    const key = makeKey(role, docName)
                    const isEditing = editingKey === key

                    if (isEditing) {
                      return (
                        <div key={docName} className="rounded border p-2 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono">{docName}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(role, docName)}
                                className="p-1 rounded hover:bg-muted transition-colors"
                                title="Save"
                              >
                                <Save className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="p-1 rounded hover:bg-muted transition-colors"
                                title="Cancel"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <textarea
                            className="w-full min-h-[80px] p-2 text-xs font-mono border rounded bg-background resize-y"
                            value={docDraft}
                            onChange={(e) => setDocDraft(e.target.value)}
                          />
                        </div>
                      )
                    }

                    return (
                      <div
                        key={docName}
                        className="group flex items-center gap-2 rounded border p-2 text-xs"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 font-mono">{docName}</span>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(role, docName)}
                          className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                          title={`Edit ${docName}`}
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
