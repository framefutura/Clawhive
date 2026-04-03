import React, { useState, useEffect, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilePreviewProps {
  filePath: string
}

interface ReadResult {
  type: 'text' | 'html' | 'binary'
  data: unknown
}

// Simple CSV to table converter
function CsvTable({ csv }: { csv: string }) {
  const rows = useMemo(() => {
    return csv.split('\n').filter(row => row.trim()).map(row => row.split(','))
  }, [csv])

  if (rows.length === 0) return <div className="p-4 text-muted-foreground">Empty file</div>

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {rows[0].map((cell, i) => (
              <th key={i} className="px-4 py-2 text-left font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b hover:bg-muted/30">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Markdown preview with simple formatting
function MarkdownPreview({ content }: { content: string }) {
  // Simple markdown to HTML conversion
  const html = useMemo(() => {
    let processed = content
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-md my-3 overflow-x-auto"><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener">$1</a>')
      // Lists
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="my-3">')
      // Line breaks
      .replace(/\n/g, '<br />')

    return `<div class="prose prose-sm max-w-none dark:prose-invert">${processed}</div>`
  }, [content])

  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'code', 'pre', 'a', 'li', 'ul', 'ol', 'br', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  })

  return (
    <div
      className="p-6"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}

// PDF preview using iframe
function PdfPreview({ data }: { data: Uint8Array }) {
  const blobUrl = useMemo(() => {
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/pdf' })
    return URL.createObjectURL(blob)
  }, [data])

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  return (
    <iframe
      src={blobUrl}
      className="w-full h-full"
      title="PDF Preview"
      sandbox="allow-same-origin"
    />
  )
}

// HTML preview with sanitization
function HtmlPreview({ html }: { html: string }) {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'div', 'span'],
    ALLOWED_ATTR: ['class', 'style'],
  })

  return (
    <div
      className="p-6 prose prose-sm max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}

export function FilePreview({ filePath }: FilePreviewProps) {
  const [content, setContent] = useState<ReadResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadContent = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await window.clawhive.readFile(filePath)
        if (!cancelled) {
          setContent(result as ReadResult)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to read file')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadContent()

    return () => {
      cancelled = true
    }
  }, [filePath])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No content available</p>
      </div>
    )
  }

  const fileName = filePath.split('/').pop() || ''
  const fileExt = fileName.split('.').pop()?.toLowerCase()

  return (
    <div className="h-full flex flex-col">
      {/* File Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{fileName}</span>
        </div>
        <span className="text-xs text-muted-foreground uppercase">{fileExt}</span>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto">
        {content.type === 'text' && fileExt === 'md' ? (
          <MarkdownPreview content={content.data as string} />
        ) : content.type === 'text' && (fileExt === 'csv' || fileExt === 'xlsx' || fileExt === 'xls') ? (
          <CsvTable csv={content.data as string} />
        ) : content.type === 'text' ? (
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap">{content.data as string}</pre>
        ) : content.type === 'html' ? (
          <HtmlPreview html={content.data as string} />
        ) : content.type === 'binary' && fileExt === 'pdf' ? (
          <PdfPreview data={content.data as Uint8Array} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Binary file - preview not available</p>
              <p className="text-sm mt-2">Double-click to open externally</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
