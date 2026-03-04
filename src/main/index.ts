import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from './store'

// 窗口状态存储
const windowState = new Store({
  configName: 'window-state',
  defaults: {
    width: 400,
    height: 600,
    x: undefined as number | undefined,
    y: undefined as number | undefined,
    alwaysOnTop: true
  }
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  const state = windowState.get()

  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    show: false,
    frame: false,  // 无边框窗口
    transparent: true,  // 透明背景
    alwaysOnTop: state.alwaysOnTop,  // 置顶
    skipTaskbar: false,
    resizable: true,
    minimizable: true,
    maximizable: false,  // 禁止最大化
    useContentSize: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    // 窗口样式
    backgroundColor: '#00000000'
  })

  // 设置最小窗口尺寸
  mainWindow.setMinimumSize(350, 450)

  // 加载内容
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 窗口准备好后显示
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // 窗口关闭时保存状态
  mainWindow.on('close', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds()
      windowState.set({
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        alwaysOnTop: mainWindow.isAlwaysOnTop()
      })
    }
  })

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
}

// 创建系统托盘
function createTray(): void {
  // 使用简单图标（可以替换为实际图标）
  const trayIcon = nativeImage.createFromDataURL(`
    data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAxMS8wOS8xM5w+9/QAAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzVxteM2AAAAjklEQVQ4je3UsQ2AMAxE0Q9lJ2ZhJ2ZhJ2ZhJ2ZhJ2ZhJ2ZhJ2ZhJ2ZhJ4SQIiQKUEi+K/3n82f73iT1zrm1Nk9DI6W0SynNzPwY43uD75x7A9gA2FJKMyJeEXFH4C/wjYgHIvYREUA9jDE+QghrCOE6z/Pw3l8R0UfE0Fq7zjkPwzBcG6P3fu+9L6W8Z+ZHrfUDbACMuIBLaykAAAAASUVORK5CYII=
  `)
  
  tray = new Tray(trayIcon)
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide()
          } else {
            mainWindow.show()
          }
        } else {
          createWindow()
        }
      }
    },
    {
      label: '置顶',
      type: 'checkbox',
      checked: mainWindow?.isAlwaysOnTop() || false,
      click: (menuItem) => {
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(menuItem.checked)
          windowState.set('alwaysOnTop', menuItem.checked)
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setToolTip('Lzuea Todo')
  tray.setContextMenu(contextMenu)
  
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
      }
    } else {
      createWindow()
    }
  })
}

// IPC 处理
// 窗口控制
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window:close', () => {
  mainWindow?.hide()
})

ipcMain.handle('window:toggle-always-on-top', () => {
  if (mainWindow) {
    const isAlwaysOnTop = !mainWindow.isAlwaysOnTop()
    mainWindow.setAlwaysOnTop(isAlwaysOnTop)
    windowState.set('alwaysOnTop', isAlwaysOnTop)
    return isAlwaysOnTop
  }
  return false
})

ipcMain.handle('window:get-always-on-top', () => {
  return mainWindow?.isAlwaysOnTop() || false
})

// 应用生命周期
app.whenReady().then(() => {
  // 设置应用ID
  electronApp.setAppUserModelId('com.electron.lzuea-todo')

  // 监听窗口创建
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  createTray()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 所有窗口关闭时不退出（保持托盘运行）
app.on('window-all-closed', () => {
  // macOS 除外
  if (process.platform !== 'darwin') {
    // 不调用 app.quit()，保持托盘运行
  }
})

// 退出前清理
try {
  require('electron-reloader')(module, {
    debug: true,
    watchRenderer: true
  })
} catch (_) {}
