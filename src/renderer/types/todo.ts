// 待办任务类型
export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  updatedAt: number
  deleted?: boolean
}

// 任务过滤器
export type TodoFilter = 'all' | 'active' | 'completed'

// 用户类型
export interface User {
  id: string
  username: string
  email?: string
  lastSyncAt?: string
}
