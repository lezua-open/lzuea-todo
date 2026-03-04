import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

interface StoreOptions<T> {
  configName: string
  defaults: T
}

export default class Store<T extends Record<string, any>> {
  private path: string
  private data: T

  constructor(options: StoreOptions<T>) {
    const userDataPath = app.getPath('userData')
    
    // 确保目录存在
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }
    
    this.path = join(userDataPath, `${options.configName}.json`)
    this.data = this.parseDataFile(options.defaults)
  }

  private parseDataFile(defaults: T): T {
    try {
      if (!existsSync(this.path)) {
        return defaults
      }
      const fileContent = readFileSync(this.path, 'utf-8')
      return { ...defaults, ...JSON.parse(fileContent) }
    } catch (error) {
      console.error('Error reading store file:', error)
      return defaults
    }
  }

  get(): T
  get<K extends keyof T>(key: K): T[K]
  get(key?: keyof T): T | T[keyof T] {
    if (key === undefined) {
      return this.data
    }
    return this.data[key]
  }

  set<K extends keyof T>(key: K, value: T[K]): void
  set(partial: Partial<T>): void
  set<K extends keyof T>(keyOrPartial: K | Partial<T>, value?: T[K]): void {
    if (typeof keyOrPartial === 'object') {
      this.data = { ...this.data, ...keyOrPartial }
    } else {
      this.data[keyOrPartial] = value as T[K]
    }
    this.save()
  }

  private save(): void {
    try {
      writeFileSync(this.path, JSON.stringify(this.data, null, 2))
    } catch (error) {
      console.error('Error saving store file:', error)
    }
  }
}
