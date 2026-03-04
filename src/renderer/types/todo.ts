// 待办任务类型
export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  updatedAt: number
}

// 任务过滤器
export type TodoFilter = 'all' | 'active' | 'completed'
