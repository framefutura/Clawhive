import React, { useState } from 'react'
import {
  Columns,
  LayoutList,
  LayoutGrid,
  Maximize2,
  X,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type EditorMode = 'split-pane' | 'tabbed' | 'card'

interface DocEntry {
  name: string
  content: string
}

interface InteractionEditorProps {
  docs: DocEntry[]
  onSave?: (docName: string, content: string) => void
}

const MODE_ICONS: Record<EditorMode, React.ReactNode> = {
  'split-pane': <Columns className="h-3.5 w-3.5" />,
  tabbed: <LayoutList className="h-3.5 w-3.5" />,
  card: <LayoutGrid className="h-3.5 w-3.5" />,
}

const MODE_LABELS: Record<EditorMode, string> = {
  'split-pane': 'Split Pane',
  tabbed: 'Tabbed',
  card: 'Cards',
}

export function InteractionEditor({ docs, onSave }: InteractionEditorProps) {
  const [mode, setMode] = useState<EditorMode>('split-pane')
  const [selectedDoc, setSelectedDoc] = useState(docs[0]?.name ?? '')
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(docs.map((d) => [d.name, d.content]))
  )
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  const handleDraftChange = (docName: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [docName]: value }))
  }

  const handleSave = (docName: string) => {
    onSave?.(docName, drafts[docName] || '')
  }

  const currentDoc = docs.find((d) => d.name === selectedDoc) || docs[0]

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar with mode switcher */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground">Interaction Editor</div>
        <div className="flex items-center gap-1">
          {(['split-pane', 'tabbed', 'card'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'p-1.5 rounded transition-colors',
                mode === m ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
              )}
              title={MODE_LABELS[m]}
            >
              {MODE_ICONS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Editor content based on mode */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === 'split-pane' && (
          <SplitPaneView
            docs={docs}
            selectedDoc={selectedDoc}
            drafts={drafts}
            onSelectDoc={setSelectedDoc}
            onDraftChange={handleDraftChange}
            onSave={handleSave}
          />
        )}
        {mode === 'tabbed' && (
          <TabbedView
            docs={docs}
            selectedDoc={selectedDoc}
            drafts={drafts}
            onSelectDoc={setSelectedDoc}
            onDraftChange={handleDraftChange}
            onSave={handleSave}
          />
        )}
        {mode === 'card' && (
          <CardView
            docs={docs}
            drafts={drafts}
            expandedCard={expandedCard}
            onExpandCard={setExpandedCard}
            onDraftChange={handleDraftChange}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  )
}

/* ---------- Split-pane mode ---------- */

function SplitPaneView({
  docs,
  selectedDoc,
  drafts,
  onSelectDoc,
  onDraftChange,
  onSave,
}: {
  docs: DocEntry[]
  selectedDoc: string
  drafts: Record<string, string>
  onSelectDoc: (name: string) => void
  onDraftChange: (name: string, value: string) => void
  onSave: (name: string) => void
}) {
  return (
    <div className="flex h-full">
      {/* File list (40%) */}
      <div className="w-2/5 border-r overflow-auto p-2 space-y-1">
        {docs.map((doc) => (
          <button
            key={doc.name}
            type="button"
            onClick={() => onSelectDoc(doc.name)}
            className={cn(
              'flex items-center gap-2 w-full rounded p-2 text-xs transition-colors',
              selectedDoc === doc.name
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-mono">{doc.name}</span>
          </button>
        ))}
      </div>

      {/* Editor + preview (60%) */}
      <div className="flex-1 flex flex-col p-2 gap-2 min-w-0">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-muted-foreground">{selectedDoc}</span>
          <button
            type="button"
            onClick={() => onSave(selectedDoc)}
            className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90"
          >
            Save
          </button>
        </div>
        <textarea
          className="flex-1 w-full p-2 text-xs font-mono border rounded bg-background resize-none"
          value={drafts[selectedDoc] || ''}
          onChange={(e) => onDraftChange(selectedDoc, e.target.value)}
        />
      </div>
    </div>
  )
}

/* ---------- Tabbed mode ---------- */

function TabbedView({
  docs,
  selectedDoc,
  drafts,
  onSelectDoc,
  onDraftChange,
  onSave,
}: {
  docs: DocEntry[]
  selectedDoc: string
  drafts: Record<string, string>
  onSelectDoc: (name: string) => void
  onDraftChange: (name: string, value: string) => void
  onSave: (name: string) => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b px-2 pt-1 overflow-x-auto">
        {docs.map((doc) => (
          <button
            key={doc.name}
            type="button"
            onClick={() => onSelectDoc(doc.name)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-t transition-colors whitespace-nowrap font-mono',
              selectedDoc === doc.name
                ? 'bg-background border border-b-0 text-foreground'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {doc.name}
          </button>
        ))}
      </div>

      {/* Active doc editor */}
      <div className="flex-1 flex flex-col p-2 gap-2 min-h-0">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => onSave(selectedDoc)}
            className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90"
          >
            Save
          </button>
        </div>
        <textarea
          className="flex-1 w-full p-2 text-xs font-mono border rounded bg-background resize-none"
          value={drafts[selectedDoc] || ''}
          onChange={(e) => onDraftChange(selectedDoc, e.target.value)}
        />
      </div>
    </div>
  )
}

/* ---------- Card mode ---------- */

function CardView({
  docs,
  drafts,
  expandedCard,
  onExpandCard,
  onDraftChange,
  onSave,
}: {
  docs: DocEntry[]
  drafts: Record<string, string>
  expandedCard: string | null
  onExpandCard: (name: string | null) => void
  onDraftChange: (name: string, value: string) => void
  onSave: (name: string) => void
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-2 p-2 overflow-auto h-full content-start">
        {docs.map((doc) => (
          <div key={doc.name} className="rounded border p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-medium">{doc.name}</span>
              <button
                type="button"
                onClick={() => onExpandCard(doc.name)}
                className="p-1 rounded hover:bg-muted transition-colors"
                title="Expand to full-screen editor"
              >
                <Maximize2 className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
            <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap max-h-[60px] overflow-hidden">
              {(drafts[doc.name] || '').slice(0, 200) || '(empty)'}
            </pre>
          </div>
        ))}
      </div>

      {/* Full-screen modal for deep editing */}
      {expandedCard && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-8">
          <div
            className="bg-background rounded-lg shadow-lg flex flex-col"
            style={{ width: '90vw', height: '90vh', maxWidth: '90vw', maxHeight: '90vh' }}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-mono font-medium">{expandedCard}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSave(expandedCard)}
                  className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => onExpandCard(null)}
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <textarea
              className="flex-1 w-full p-4 text-sm font-mono bg-background resize-none outline-none"
              value={drafts[expandedCard] || ''}
              onChange={(e) => onDraftChange(expandedCard, e.target.value)}
              autoFocus
            />
          </div>
        </div>
      )}
    </>
  )
}
