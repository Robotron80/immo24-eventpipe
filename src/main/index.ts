import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, Menu } from 'electron'
import settingsHtml from './settings.html?raw'
import settingsScript from './settings.js?raw'
import settingsStyle from './settings.css?raw'
import splashHtml from './splash.html?raw'
import splashStyle from './splash.css?raw'

import type { EventPipeSettings } from '../shared/types'
import { getExportHistoryPath } from './historyService'
import { writeLog } from './logService'
import { registerIpcHandlers } from './registerIpcHandlers'
import {
  DEFAULT_SETTINGS,
  getConfigPath,
  hasSettingsFile,
  loadSettings,
} from './settingsService'

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let workflowWindow: BrowserWindow | null = null
const workflowStartPayloadByWebContentsId = new Map<number, { mxfPath?: string; wavPath?: string }>()
let splashShownAt = 0
let activeSettings: EventPipeSettings = { ...DEFAULT_SETTINGS }
let activeConfigPath = ''
let activeHistoryPath = ''
let shouldOpenSettingsOnStartup = false
const cliDebugLoggingEnabled =
  process.argv.includes('--debug-logging') ||
  ['1', 'true', 'yes', 'on'].includes((process.env.EVENTPIPE_DEBUG_LOGGING || '').toLowerCase())
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
}

function getDevServerOrigin(): string | undefined {
  if (!process.env.VITE_DEV_SERVER_URL) {
    return undefined
  }

  try {
    return new URL(process.env.VITE_DEV_SERVER_URL).origin
  } catch {
    return undefined
  }
}

function attachNavigationGuards(window: BrowserWindow, isAllowedUrl: (url: string) => boolean): void {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, navigationUrl) => {
    if (isAllowedUrl(navigationUrl)) {
      return
    }

    event.preventDefault()
  })
}

function withRuntimeDebugLogging(settings: EventPipeSettings): EventPipeSettings {
  // CLI/env debug flags override persisted config for this launch only.
  return {
    ...settings,
    debugLoggingEnabled: cliDebugLoggingEnabled,
  }
}

function debugLog(message: string, context?: Record<string, unknown>): void {
  if (!activeSettings.debugLoggingEnabled) {
    return
  }

  writeLog({
    level: 'info',
    message,
    context,
  })
}

function resolveSplashIconDataUrl(): string {
  // Splash is delivered as inline HTML, so image data is injected as base64 URL.
  const appPath = app.getAppPath()
  const candidates = [
    path.resolve(process.resourcesPath, 'assets/icon.png'),
    path.resolve(appPath, 'src/assets/icon.png'),
    path.resolve(appPath, 'dist/assets/icon.png'),
  ]

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) {
      continue
    }

    const encoded = fs.readFileSync(filePath).toString('base64')
    return `data:image/png;base64,${encoded}`
  }

  return ''
}

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 250,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    minimizable: false,
    maximizable: false,
    center: true,
    fullscreenable: false,
    alwaysOnTop: true,
    movable: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  })

  attachNavigationGuards(splashWindow, (url) => url.startsWith('data:text/html'))

  const resolvedSplashHtml = splashHtml
    .replace('__SPLASH_STYLE__', splashStyle)
    .replace('__SPLASH_ICON_SRC__', resolveSplashIconDataUrl())
    .replace('__APP_VERSION__', app.getVersion())
  splashWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(resolvedSplashHtml)}`)
  splashShownAt = Date.now()
  splashWindow.show()
}

function openSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  const parent = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() ? mainWindow : undefined

  settingsWindow = new BrowserWindow({
    width: 780,
    height: 400,
    minWidth: 780,
    minHeight: 400,
    resizable: true,
    title: 'Konfiguration',
    parent,
    modal: Boolean(parent),
    show: false,
    backgroundColor: '#f5f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  attachNavigationGuards(settingsWindow, (url) => url.startsWith('data:text/html'))

  settingsWindow.setMenu(null)
  const resolvedSettingsHtml = settingsHtml
    .replace('__SETTINGS_STYLE__', settingsStyle)
    .replace('__SETTINGS_SCRIPT__', settingsScript)
  settingsWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(resolvedSettingsHtml)}`)
  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show()
  })
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

function openWorkflowWindow(payload?: { mxfPath?: string; wavPath?: string }): void {
  const existingWorkflowWindow = workflowWindow
  if (
    existingWorkflowWindow &&
    !existingWorkflowWindow.isDestroyed() &&
    !existingWorkflowWindow.webContents.isDestroyed()
  ) {
    if (payload) {
      workflowStartPayloadByWebContentsId.set(existingWorkflowWindow.webContents.id, payload)
    }

    existingWorkflowWindow.focus()
    return
  }

  const parent = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() ? mainWindow : undefined

  workflowWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 780,
    minHeight: 560,
    resizable: true,
    title: 'Exportdialog',
    parent,
    modal: Boolean(parent),
    show: false,
    backgroundColor: '#f5f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const devOrigin = getDevServerOrigin()
  attachNavigationGuards(workflowWindow, (url) => {
    if (devOrigin) {
      return url.startsWith(devOrigin)
    }

    return url.startsWith('file://')
  })

  if (payload) {
    workflowStartPayloadByWebContentsId.set(workflowWindow.webContents.id, payload)
  }

  const workflowWebContentsId = workflowWindow.webContents.id

  workflowWindow.setMenu(null)

  if (process.env.VITE_DEV_SERVER_URL) {
    const dialogUrl = new URL(process.env.VITE_DEV_SERVER_URL)
    dialogUrl.searchParams.set('window', 'workflow')
    workflowWindow.loadURL(dialogUrl.toString())
  } else {
    workflowWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { window: 'workflow' },
    })
  }

  workflowWindow.once('ready-to-show', () => {
    workflowWindow?.show()
  })

  workflowWindow.on('closed', () => {
    workflowStartPayloadByWebContentsId.delete(workflowWebContentsId)

    workflowWindow = null
  })
}

async function ensureMinimumSplashDuration(minimumMs = 2000): Promise<void> {
  if (splashShownAt === 0) {
    return
  }

  const elapsed = Date.now() - splashShownAt
  const remaining = minimumMs - elapsed

  if (remaining <= 0) {
    return
  }

  await new Promise((resolve) => setTimeout(resolve, remaining))
}

function createApplicationMenu(): void {
  const isMac = process.platform === 'darwin'
  const isDevMode = Boolean(process.env.VITE_DEV_SERVER_URL)
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' }, { type: 'separator' },
        { label: 'Konfiguration', accelerator: 'CommandOrControl+,', click: openSettingsWindow },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : [{
      label: 'Datei',
      submenu: [
        { label: 'Konfiguration', accelerator: 'CommandOrControl+,', click: openSettingsWindow },
        { type: 'separator' }, { role: 'quit' }
      ]
    }]),
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          { label: 'Sprachausgabe', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    ...(isDevMode ? [{
      // Keep debug actions visible only while running in development mode.
      label: 'Entwickler',
      submenu: [
        { role: 'toggleDevTools' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleFullScreen' }
      ]
    }] : [])
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template as any))
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 320,
    height: 320,
    useContentSize: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    backgroundColor: '#f5f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const devOrigin = getDevServerOrigin()
  attachNavigationGuards(mainWindow, (url) => {
    if (devOrigin) {
      return url.startsWith(devOrigin)
    }

    return url.startsWith('file://')
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.once('did-finish-load', async () => {
    // Prevent fast startup flicker by enforcing a minimal splash display time.
    await ensureMinimumSplashDuration(2000)
    splashWindow?.close()
    splashWindow = null
    mainWindow?.show()

    if (shouldOpenSettingsOnStartup) {
      openSettingsWindow()
      shouldOpenSettingsOnStartup = false
    }
  })
}

app.whenReady().then(() => {
  // Startup order: load settings, create windows, register IPC handlers.
  app.setName('immo24 EventPipe')

  activeConfigPath = getConfigPath()
  activeHistoryPath = getExportHistoryPath(activeConfigPath)

  return hasSettingsFile(activeConfigPath).then(async (hasConfigFile) => {
    shouldOpenSettingsOnStartup = !hasConfigFile
    activeSettings = withRuntimeDebugLogging(
      hasConfigFile ? await loadSettings(activeConfigPath) : { ...DEFAULT_SETTINGS },
    )

    createSplashWindow()
    createApplicationMenu()

    registerIpcHandlers({
      getActiveSettings: () => activeSettings,
      setActiveSettings: (settings) => {
        activeSettings = settings
      },
      getActiveConfigPath: () => activeConfigPath,
      getActiveHistoryPath: () => activeHistoryPath,
      openWorkflowWindow,
      workflowStartPayloadByWebContentsId,
      getDialogOwnerWindow: () =>
        settingsWindow && !settingsWindow.isDestroyed() ? settingsWindow : mainWindow ?? undefined,
      debugLog,
      withRuntimeDebugLogging,
      isTrustedRenderer: (webContentsId, frameUrl) => {
        const trustedIds = [
          mainWindow?.webContents.id,
          workflowWindow?.webContents.id,
          settingsWindow?.webContents.id,
        ].filter((id): id is number => typeof id === 'number')

        if (!trustedIds.includes(webContentsId)) {
          return false
        }

        const devOrigin = getDevServerOrigin()
        if (devOrigin && frameUrl.startsWith(devOrigin)) {
          return true
        }

        if (frameUrl.startsWith('file://') || frameUrl.startsWith('data:text/html')) {
          return true
        }

        return false
      },
    })

    createMainWindow()

    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.focus()
        return
      }

      createMainWindow()
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
      }
    })
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
