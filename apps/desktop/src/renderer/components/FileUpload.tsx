import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface FileUploadProps {
  onUpload: (files: File[]) => void
  selectedFiles?: File[]
  onRemoveFile?: (index: number) => void
  className?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/*',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
  'text/javascript',
  'text/typescript',
  'text/x-python',
]

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />
  return <FileText className="h-4 w-4" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUpload({ onUpload, selectedFiles = [], onRemoveFile, className }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files)
      const validFiles = files.filter(f => f.size <= MAX_FILE_SIZE)
      if (validFiles.length > 0) onUpload(validFiles)
    },
    [onUpload]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : []
      const validFiles = files.filter(f => f.size <= MAX_FILE_SIZE)
      if (validFiles.length > 0) onUpload(validFiles)
      e.target.value = '' // Reset input
    },
    [onUpload]
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn("relative", className)}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept={ALLOWED_TYPES.join(',')}
        aria-label="Upload files"
      />

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md text-xs"
            >
              {getFileIcon(file.type)}
              <span className="max-w-[100px] truncate">{file.name}</span>
              <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
              {onRemoveFile && (
                <button
                  onClick={() => onRemoveFile(i)}
                  className="p-0.5 hover:bg-muted-foreground/20 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button / Drop Zone */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative",
          isDragging && "bg-primary/10 text-primary"
        )}
        aria-label="Attach file"
      >
        <Paperclip className="h-4 w-4" />
        {isDragging && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
            Drop
          </span>
        )}
      </Button>
    </div>
  )
}

// Hook to handle clipboard paste globally
export function useClipboardPaste(onPaste: (files: File[]) => void) {
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const files: File[] = []
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file && file.size <= MAX_FILE_SIZE) files.push(file)
        }
      }
      if (files.length > 0) {
        e.preventDefault()
        onPaste(files)
      }
    }

    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [onPaste])
}
