import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText,
  FileSpreadsheet,
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  RefreshCw,
  MoreVertical,
  ExternalLink,
  Trash2,
  Edit3,
  Copy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FilePreview } from './FilePreview'

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

interface CreatableFormat {
  id: string
  name: string
  extensions: string[]
}

interface FileManagerProps {
  workspaceId: string
  rootPath: string
  onSelectFile: (path: string) => void
  selectedFile?: string
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  node: TreeNode | null
}

function getFileIcon(fileName: string) {
  const ext = fileName.toLowerCase().split('.').pop()
  switch (ext) {
    case 'md':
    case 'markdown':
    case 'txt':
      return <FileText className="h-4 w-4 text-blue-500" />
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />
    case 'pdf':
      return <FileText className="h-4 w-4 text-red-500" />
    case 'docx':
    case 'doc':
      return <FileText className="h-4 w-4 text-blue-700" />
    default:
      return <File className="h-4 w-4 text-muted-foreground" />
  }
}

function TreeNodeItem({
  node,
  depth = 0,
  selectedFile,
  expandedDirs,
  onToggleDir,
  onSelectFile,
  onContextMenu,
}: {
  node: TreeNode
  depth?: number
  selectedFile?: string
  expandedDirs: Set<string>
  onToggleDir: (path: string) => void
  onSelectFile: (path: string) => void
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void
}) {
  const isExpanded = expandedDirs.has(node.path)
  const isSelected = selectedFile === node.path

  if (node.type === 'directory') {
    return (
      <div>
        <div
          className={cn(
            'flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted transition-colors',
            isSelected && 'bg-primary/10'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => onToggleDir(node.path)}
          onContextMenu={(e) => onContextMenu(e, node)}
        >
          <button
            className="p-0.5 hover:bg-muted-foreground/20 rounded"
            onClick={(e) => {
              e.stopPropagation()
              onToggleDir(node.path)
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-yellow-500" />
          ) : (
            <Folder className="h-4 w-4 text-yellow-500" />
          )}
          <span className="text-sm truncate">{node.name}</span>
        </div>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedFile={selectedFile}
                expandedDirs={expandedDirs}
                onToggleDir={onToggleDir}
                onSelectFile={onSelectFile}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted transition-colors',
        isSelected && 'bg-primary/10'
      )}
      style={{ paddingLeft: `${depth * 12 + 28}px` }}
      onClick={() => onSelectFile(node.path)}
      onDoubleClick={() => window.clawhive.openFileExternal(node.path)}
      onContextMenu={(e) => onContextMenu(e, node)}
    >
      {getFileIcon(node.name)}
      <span className="text-sm truncate">{node.name}</span>
    </div>
  )
}

export function FileManager({ workspaceId, rootPath, onSelectFile, selectedFile }: FileManagerProps) {
  const [fileTree, setFileTree] = useState<TreeNode[]>([])
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [creatableFormats, setCreatableFormats] = useState<CreatableFormat[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  })
  const [renamingNode, setRenamingNode] = useState<TreeNode | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Load file tree
  const loadFileTree = useCallback(async () => {
    try {
      const tree = await window.clawhive.listFiles(rootPath)
      setFileTree(tree)
    } catch (err) {
      console.error('Failed to load file tree:', err)
    }
  }, [rootPath])

  // Load creatable formats
  const loadCreatableFormats = useCallback(async () => {
    try {
      const formats = await window.clawhive.listCreatableFormats()
      setCreatableFormats(formats)
    } catch (err) {
      console.error('Failed to load creatable formats:', err)
    }
  }, [])

  useEffect(() => {
    loadFileTree()
    loadCreatableFormats()
  }, [loadFileTree, loadCreatableFormats])

  // Focus rename input
  useEffect(() => {
    if (renamingNode && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingNode])

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }))
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const handleToggleDir = useCallback((path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node,
    })
  }, [])

  const handleCreateFile = async () => {
    if (!selectedFormat || !newFileName.trim()) return

    const format = creatableFormats.find(f => f.id === selectedFormat)
    if (!format) return

    const ext = format.extensions[0]
    const fileName = newFileName.trim().endsWith(ext)
      ? newFileName.trim()
      : `${newFileName.trim()}${ext}`
    const filePath = `${rootPath}/files/${fileName}`

    try {
      await window.clawhive.createFile(filePath, selectedFormat)
      await loadFileTree()
      onSelectFile(filePath)
      setIsCreating(false)
      setNewFileName('')
      setSelectedFormat(null)
    } catch (err) {
      console.error('Failed to create file:', err)
    }
  }

  const handleDeleteFile = async () => {
    if (!contextMenu.node) return

    try {
      await window.clawhive.deleteFile(contextMenu.node.path)
      await loadFileTree()
      if (selectedFile === contextMenu.node.path) {
        onSelectFile('')
      }
      setContextMenu(prev => ({ ...prev, visible: false }))
    } catch (err) {
      console.error('Failed to delete file:', err)
    }
  }

  const handleRenameStart = () => {
    if (!contextMenu.node) return
    setRenamingNode(contextMenu.node)
    setRenameValue(contextMenu.node.name)
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleRenameCommit = async () => {
    if (!renamingNode || !renameValue.trim()) {
      setRenamingNode(null)
      return
    }

    const newPath = renamingNode.path.replace(renamingNode.name, renameValue.trim())

    try {
      await window.clawhive.renameFile(renamingNode.path, newPath)
      await loadFileTree()
      if (selectedFile === renamingNode.path) {
        onSelectFile(newPath)
      }
    } catch (err) {
      console.error('Failed to rename file:', err)
    }

    setRenamingNode(null)
  }

  const handleRenameCancel = () => {
    setRenamingNode(null)
    setRenameValue('')
  }

  const handleDuplicateFile = async () => {
    if (!contextMenu.node || contextMenu.node.type !== 'file') return

    const baseName = contextMenu.node.name
    const extIndex = baseName.lastIndexOf('.')
    const name = extIndex > 0 ? baseName.slice(0, extIndex) : baseName
    const ext = extIndex > 0 ? baseName.slice(extIndex) : ''
    const newName = `${name} (copy)${ext}`
    const newPath = contextMenu.node.path.replace(baseName, newName)

    try {
      // Read and write to duplicate
      const content = await window.clawhive.readFile(contextMenu.node.path)
      const format = creatableFormats.find(f =>
        f.extensions.some(e => contextMenu.node!.path.toLowerCase().endsWith(e))
      )
      if (format) {
        // For now, just create a new file with the same format
        await window.clawhive.createFile(newPath, format.id)
      }
      await loadFileTree()
      setContextMenu(prev => ({ ...prev, visible: false }))
    } catch (err) {
      console.error('Failed to duplicate file:', err)
    }
  }

  return (
    <div className="flex h-full">
      {/* Left Pane - File Tree */}
      <div className="w-[280px] border-r flex flex-col bg-card">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-2 border-b">
          <span className="text-sm font-medium text-muted-foreground">Files</span>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                  title="New File"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {creatableFormats.map(format => (
                  <DropdownMenuItem
                    key={format.id}
                    onClick={() => {
                      setSelectedFormat(format.id)
                      setIsCreating(true)
                      setNewFileName('Untitled')
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {format.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              className="p-1.5 hover:bg-muted rounded transition-colors"
              onClick={loadFileTree}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* New File Input */}
        {isCreating && (
          <div className="p-2 border-b">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile()
                if (e.key === 'Escape') {
                  setIsCreating(false)
                  setNewFileName('')
                  setSelectedFormat(null)
                }
              }}
              onBlur={handleCreateFile}
              className="w-full px-2 py-1 text-sm border rounded bg-background"
              placeholder="Filename..."
              autoFocus
            />
          </div>
        )}

        {/* File Tree */}
        <ScrollArea className="flex-1">
          <div className="p-1">
            {fileTree.map(node => (
              <TreeNodeItem
                key={node.path}
                node={node}
                selectedFile={selectedFile}
                expandedDirs={expandedDirs}
                onToggleDir={handleToggleDir}
                onSelectFile={onSelectFile}
                onContextMenu={handleContextMenu}
              />
            ))}
            {fileTree.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No files yet
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Breadcrumb */}
        <div className="p-2 border-t text-xs text-muted-foreground truncate">
          {rootPath.split('/').slice(-2).join('/')}
        </div>
      </div>

      {/* Right Pane - Preview */}
      <div className="flex-1 bg-background">
        {selectedFile ? (
          <FilePreview filePath={selectedFile} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a file to preview</p>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.node && (
        <div
          className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.node.type === 'file' && (
            <>
              <button
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                onClick={() => {
                  window.clawhive.openFileExternal(contextMenu.node!.path)
                  setContextMenu(prev => ({ ...prev, visible: false }))
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </button>
              <DropdownMenuSeparator />
            </>
          )}
          <button
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
            onClick={handleRenameStart}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Rename
          </button>
          {contextMenu.node.type === 'file' && (
            <button
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
              onClick={handleDuplicateFile}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </button>
          )}
          <DropdownMenuSeparator />
          <button
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent text-destructive"
            onClick={handleDeleteFile}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      )}

      {/* Rename Modal */}
      {renamingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-popover rounded-lg p-4 w-[300px] shadow-lg">
            <h3 className="text-sm font-medium mb-3">Rename</h3>
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameCommit()
                if (e.key === 'Escape') handleRenameCancel()
              }}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                className="px-3 py-1.5 text-sm rounded hover:bg-muted"
                onClick={handleRenameCancel}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleRenameCommit}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
