import { BrowserView, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'

interface BrowserTab {
  id: string
  view: BrowserView
  url: string
  title: string
}

export class BrowserManager {
  private tabs = new Map<string, BrowserTab>()
  private window: BrowserWindow
  private visibleTabId: string | null = null

  constructor(window: BrowserWindow) {
    this.window = window

    // Listen for window resize to re-layout browser views
    this.window.on('resize', () => {
      this.layoutAll(this.window.getBounds())
    })

    // Listen for move to update bounds
    this.window.on('move', () => {
      this.layoutAll(this.window.getBounds())
    })
  }

  /**
   * Create a new browser tab with an isolated session
   */
  createTab(tabId: string, initialUrl?: string): BrowserTab {
    // Create a separate session partition for isolation
    const partition = `persist:browser-${tabId}`

    const view = new BrowserView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        partition,
      },
    })

    // Set initial bounds (will be updated by layoutAll)
    const bounds = this.window.getBounds()
    view.setBounds({
      x: 0,
      y: 80, // Reserve 80px for toolbar + tab bar
      width: bounds.width,
      height: bounds.height - 80,
    })

    // Initially hidden until activated
    view.setAutoResize({ width: true, height: true })

    const tab: BrowserTab = {
      id: tabId,
      view,
      url: initialUrl || 'about:blank',
      title: 'New Tab',
    }

    this.tabs.set(tabId, tab)

    // Listen for navigation events
    view.webContents.on('did-navigate', (_event, url) => {
      tab.url = url
      this.emitUrlChanged(tabId, url)
    })

    view.webContents.on('did-navigate-in-page', (_event, url) => {
      tab.url = url
      this.emitUrlChanged(tabId, url)
    })

    // Listen for title updates
    view.webContents.on('page-title-updated', (_event, title) => {
      tab.title = title
      this.emitTitleChanged(tabId, title)
    })

    // Load initial URL
    if (initialUrl && initialUrl !== 'about:blank') {
      view.webContents.loadURL(initialUrl)
    }

    return tab
  }

  /**
   * Destroy a browser tab and clean up resources
   */
  destroyTab(tabId: string): void {
    const tab = this.tabs.get(tabId)
    if (!tab) return

    // Remove from window if currently visible
    if (this.visibleTabId === tabId) {
      this.window.removeBrowserView(tab.view)
      this.visibleTabId = null
    }

    // Destroy the webContents
    if (!tab.view.webContents.isDestroyed()) {
      tab.view.webContents.destroy()
    }

    this.tabs.delete(tabId)
  }

  /**
   * Navigate a tab to a URL
   */
  navigate(tabId: string, url: string): void {
    const tab = this.tabs.get(tabId)
    if (!tab) return

    // Ensure URL has a protocol
    let normalizedUrl = url
    if (!url.match(/^https?:\/\//)) {
      normalizedUrl = `https://${url}`
    }

    tab.view.webContents.loadURL(normalizedUrl)
    tab.url = normalizedUrl
  }

  /**
   * Go back in history
   */
  goBack(tabId: string): void {
    const tab = this.tabs.get(tabId)
    if (!tab) return

    if (tab.view.webContents.canGoBack()) {
      tab.view.webContents.goBack()
    }
  }

  /**
   * Go forward in history
   */
  goForward(tabId: string): void {
    const tab = this.tabs.get(tabId)
    if (!tab) return

    if (tab.view.webContents.canGoForward()) {
      tab.view.webContents.goForward()
    }
  }

  /**
   * Reload the current page
   */
  reload(tabId: string): void {
    const tab = this.tabs.get(tabId)
    if (!tab) return

    tab.view.webContents.reload()
  }

  /**
   * Get the current title of a tab
   */
  getTitle(tabId: string): string {
    const tab = this.tabs.get(tabId)
    return tab?.title || 'New Tab'
  }

  /**
   * Get the current URL of a tab
   */
  getUrl(tabId: string): string {
    const tab = this.tabs.get(tabId)
    return tab?.url || 'about:blank'
  }

  /**
   * Check if tab can go back
   */
  canGoBack(tabId: string): boolean {
    const tab = this.tabs.get(tabId)
    return tab?.view.webContents.canGoBack() || false
  }

  /**
   * Check if tab can go forward
   */
  canGoForward(tabId: string): boolean {
    const tab = this.tabs.get(tabId)
    return tab?.view.webContents.canGoForward() || false
  }

  /**
   * Set visibility of a browser tab
   */
  setVisible(tabId: string, visible: boolean): void {
    const tab = this.tabs.get(tabId)
    if (!tab) return

    if (visible) {
      // Hide any currently visible tab
      if (this.visibleTabId && this.visibleTabId !== tabId) {
        const currentTab = this.tabs.get(this.visibleTabId)
        if (currentTab) {
          this.window.removeBrowserView(currentTab.view)
        }
      }

      // Show this tab
      this.window.addBrowserView(tab.view)
      this.visibleTabId = tabId
      this.layoutAll(this.window.getBounds())
    } else {
      if (this.visibleTabId === tabId) {
        this.window.removeBrowserView(tab.view)
        this.visibleTabId = null
      }
    }
  }

  /**
   * Layout all browser views to fit within the window bounds
   * Reserves 80px at top for toolbar + tab bar
   */
  layoutAll(bounds: Electron.Rectangle): void {
    const toolbarHeight = 80 // 40px TopBar + 36px TabBar + spacing

    for (const tab of this.tabs.values()) {
      tab.view.setBounds({
        x: 0,
        y: toolbarHeight,
        width: bounds.width,
        height: bounds.height - toolbarHeight,
      })
    }
  }

  /**
   * Capture page text content
   */
  async capturePageText(tabId: string): Promise<string> {
    const tab = this.tabs.get(tabId)
    if (!tab) throw new Error(`Tab ${tabId} not found`)

    const text = await tab.view.webContents.executeJavaScript(`
      (function() {
        // Get text content, prioritizing main content areas
        const selectors = [
          'article',
          'main',
          '[role="main"]',
          '.content',
          '#content',
          'body'
        ]

        for (const selector of selectors) {
          const el = document.querySelector(selector)
          if (el) {
            return el.innerText || el.textContent || ''
          }
        }

        return document.body?.innerText || document.body?.textContent || ''
      })()
    `)

    return String(text).trim()
  }

  /**
   * Capture screenshot as PNG buffer
   */
  async captureScreenshot(tabId: string): Promise<Buffer> {
    const tab = this.tabs.get(tabId)
    if (!tab) throw new Error(`Tab ${tabId} not found`)

    const image = await tab.view.webContents.capturePage()
    return image.toPNG()
  }

  /**
   * Get all tab IDs
   */
  getTabIds(): string[] {
    return Array.from(this.tabs.keys())
  }

  /**
   * Clean up all browser tabs
   */
  destroyAll(): void {
    for (const tabId of this.tabs.keys()) {
      this.destroyTab(tabId)
    }
  }

  /**
   * Emit title change to renderer
   */
  private emitTitleChanged(tabId: string, title: string): void {
    this.window.webContents.send('browser:titleChanged', { tabId, title })
  }

  /**
   * Emit URL change to renderer
   */
  private emitUrlChanged(tabId: string, url: string): void {
    this.window.webContents.send('browser:urlChanged', { tabId, url })
  }
}
