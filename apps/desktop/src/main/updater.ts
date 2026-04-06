import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow, dialog } from 'electron'
import Store from 'electron-store'

const store = new Store<{ lastUpdateCheck: number }>({
  defaults: {
    lastUpdateCheck: 0,
  }
})

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export function initUpdater(mainWindow: BrowserWindow) {
  // Check for updates on startup
  checkForUpdates(mainWindow)

  // Set up interval for periodic checks
  const checkInterval = setInterval(() => {
    checkForUpdates(mainWindow)
  }, THIRTY_DAYS_MS)

  // Clean up on window close
  mainWindow.on('closed', () => {
    clearInterval(checkInterval)
  })
}

function checkForUpdates(mainWindow: BrowserWindow) {
  const lastCheck = store.get('lastUpdateCheck', 0)
  const now = Date.now()

  // Skip if checked within the last 30 days
  if (now - lastCheck < THIRTY_DAYS_MS) {
    return
  }

  // Update last check time
  store.set('lastUpdateCheck', now)

  // Check for updates (silently - no auto-download)
  autoUpdater.checkForUpdatesAndNotify().catch((err: Error) => {
    console.log('Update check failed:', err.message)
  })

  // Listen for update events
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    showUpdateAvailableDialog(mainWindow, info)
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    showUpdateReadyDialog(mainWindow, info)
  })

  autoUpdater.on('error', (err: Error) => {
    console.log('Auto-updater error:', err.message)
  })
}

function showUpdateAvailableDialog(mainWindow: BrowserWindow, info: { version: string; releaseNotes?: string }) {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `ClawHive ${info.version} is available.`,
    detail: info.releaseNotes || 'A new version is available. Would you like to download it?',
    buttons: ['Download Update', 'Remind Me Later'],
    defaultId: 1,
  }).then(({ response }) => {
    if (response === 0) {
      // User clicked "Download Update"
      autoUpdater.downloadUpdate()
    }
  })
}

function showUpdateReadyDialog(mainWindow: BrowserWindow, info: { version: string }) {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: `ClawHive ${info.version} has been downloaded.`,
    detail: 'The update will be installed when you restart the application.',
    buttons: ['Install and Restart', 'Later'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) {
      // User clicked "Install and Restart"
      autoUpdater.quitAndInstall()
    }
  })
}
