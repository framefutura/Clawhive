import React, { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ArrowRight, RotateCw, FileText, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrowserToolbarProps {
  url: string
  canGoBack: boolean
  canGoForward: boolean
  onNavigate: (url: string) => void
  onGoBack: () => void
  onGoForward: () => void
  onReload: () => void
  onCaptureText: () => void
  onCaptureScreenshot: () => void
}

export function BrowserToolbar({
  url,
  canGoBack,
  canGoForward,
  onNavigate,
  onGoBack,
  onGoForward,
  onReload,
  onCaptureText,
  onCaptureScreenshot,
}: BrowserToolbarProps) {
  const [inputValue, setInputValue] = useState(url)

  // Update input when URL changes externally
  useEffect(() => {
    setInputValue(url)
  }, [url])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    let normalizedUrl = inputValue.trim()
    if (!normalizedUrl) return

    // Add protocol if missing
    if (!normalizedUrl.match(/^https?:\/\//)) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    onNavigate(normalizedUrl)
  }, [inputValue, onNavigate])

  return (
    <div className="h-10 border-b bg-background flex items-center px-2 gap-2 shrink-0">
      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onGoBack}
          disabled={!canGoBack}
          className={cn(
            "p-1.5 rounded hover:bg-muted transition-colors",
            !canGoBack && "opacity-40 cursor-not-allowed"
          )}
          title="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={onGoForward}
          disabled={!canGoForward}
          className={cn(
            "p-1.5 rounded hover:bg-muted transition-colors",
            !canGoForward && "opacity-40 cursor-not-allowed"
          )}
          title="Go forward"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onReload}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Reload"
        >
          <RotateCw className="h-4 w-4" />
        </button>
      </div>

      {/* Address bar */}
      <form onSubmit={handleSubmit} className="flex-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter URL or search..."
          className="w-full h-8 px-3 text-sm bg-muted rounded border-0 focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </form>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onCaptureText}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded hover:bg-muted transition-colors"
          title="Extract page text"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Capture Text</span>
        </button>
        <button
          onClick={onCaptureScreenshot}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded hover:bg-muted transition-colors"
          title="Take screenshot"
        >
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">Screenshot</span>
        </button>
      </div>
    </div>
  )
}
