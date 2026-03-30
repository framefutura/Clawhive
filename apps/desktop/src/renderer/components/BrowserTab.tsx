import React, { useState, useCallback, useEffect } from 'react'
import { BrowserToolbar } from './BrowserToolbar'
import { cn } from '@/lib/utils'

interface BrowserTabProps {
  tabId: string
  initialUrl?: string
}

export function BrowserTab({ tabId, initialUrl = 'https://google.com' }: BrowserTabProps) {
  const [url, setUrl] = useState(initialUrl)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [capturedText, setCapturedText] = useState<string | null>(null)
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  // Listen for URL changes from main process
  useEffect(() => {
    const cleanup = window.clawhive.onBrowserUrlChanged((event) => {
      if (event.tabId === tabId) {
        setUrl(event.url)
        // Update navigation state
        window.clawhive.browserCanGoBack(tabId).then(setCanGoBack)
        window.clawhive.browserCanGoForward(tabId).then(setCanGoForward)
      }
    })
    return cleanup
  }, [tabId])

  const handleNavigate = useCallback((newUrl: string) => {
    window.clawhive.browserNavigate(tabId, newUrl)
    setUrl(newUrl)
  }, [tabId])

  const handleGoBack = useCallback(() => {
    window.clawhive.browserGoBack(tabId)
  }, [tabId])

  const handleGoForward = useCallback(() => {
    window.clawhive.browserGoForward(tabId)
  }, [tabId])

  const handleReload = useCallback(() => {
    window.clawhive.browserReload(tabId)
  }, [tabId])

  const handleCaptureText = useCallback(async () => {
    setIsCapturing(true)
    try {
      const text = await window.clawhive.browserCaptureText(tabId)
      setCapturedText(text)
      setCapturedScreenshot(null)
    } catch (err) {
      console.error('Failed to capture text:', err)
    } finally {
      setIsCapturing(false)
    }
  }, [tabId])

  const handleCaptureScreenshot = useCallback(async () => {
    setIsCapturing(true)
    try {
      const dataUrl = await window.clawhive.browserCaptureScreenshot(tabId)
      setCapturedScreenshot(dataUrl)
      setCapturedText(null)
    } catch (err) {
      console.error('Failed to capture screenshot:', err)
    } finally {
      setIsCapturing(false)
    }
  }, [tabId])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <BrowserToolbar
        url={url}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onNavigate={handleNavigate}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReload={handleReload}
        onCaptureText={handleCaptureText}
        onCaptureScreenshot={handleCaptureScreenshot}
      />

      {/* BrowserView placeholder - the actual BrowserView is rendered by the main process */}
      {/* This div helps with focus management and provides a visual boundary */}
      <div className="flex-1 relative">
        {/* Placeholder that matches the BrowserView bounds */}
        <div
          className="absolute inset-0 bg-background"
          onClick={() => {
            // Clicking in the browser area focuses it
            // The BrowserView handles its own focus
          }}
        />

        {/* Loading indicator */}
        {isCapturing && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Capturing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Capture results modal */}
      {(capturedText || capturedScreenshot) && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium">
                {capturedText ? 'Captured Text' : 'Screenshot'}
              </h3>
              <button
                onClick={() => {
                  setCapturedText(null)
                  setCapturedScreenshot(null)
                }}
                className="p-1 hover:bg-muted rounded"
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {capturedText && (
                <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded">
                  {capturedText}
                </pre>
              )}
              {capturedScreenshot && (
                <img
                  src={capturedScreenshot}
                  alt="Screenshot"
                  className="max-w-full rounded border"
                />
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  const content = capturedText || capturedScreenshot || ''
                  navigator.clipboard.writeText(content)
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
