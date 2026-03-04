import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
const api = {
  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close'),
    toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
    getAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top')
  }
}

// 使用 contextBridge 暴露 API
contextBridge.exposeInMainWorld('electronAPI', api)

// 类型声明（用于 TypeScript）
declare global {
  interface Window {
    electronAPI: typeof api
  }
}
