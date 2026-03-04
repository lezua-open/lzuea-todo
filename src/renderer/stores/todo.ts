import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import type { Todo, TodoFilter } from '../types/todo'

// 生成唯一ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

// 本地存储键名
const STORAGE_KEY = 'lzuea_todo_items'

export const useTodoStore = defineStore('todo', () => {
  const authStore = useAuthStore()
  
  // State
  const todos = ref<Todo[]>([])
  const filter = ref<TodoFilter>('all')
  const alwaysOnTop = ref(true)

  // Getters
  const filteredTodos = computed(() => {
    switch (filter.value) {
      case 'active':
        return todos.value.filter(todo => !todo.completed)
      case 'completed':
        return todos.value.filter(todo => todo.completed)
      default:
        return todos.value
    }
  })

  const activeCount = computed(() => 
    todos.value.filter(todo => !todo.completed).length
  )

  const completedCount = computed(() => 
    todos.value.filter(todo => todo.completed).length
  )

  const totalCount = computed(() => todos.value.length)

  // Actions
  const loadTodos = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        todos.value = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load todos:', error)
    }
  }

  const saveTodos = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.value))
    } catch (error) {
      console.error('Failed to save todos:', error)
    }
  }

  const addTodo = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const todo: Todo = {
      id: generateId(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    todos.value.unshift(todo)
    saveTodos()
  }

  const toggleTodo = (id: string) => {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      todo.completed = !todo.completed
      todo.updatedAt = Date.now()
      saveTodos()
    }
  }

  const editTodo = (id: string, newText: string) => {
    const trimmed = newText.trim()
    if (!trimmed) return

    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      todo.text = trimmed
      todo.updatedAt = Date.now()
      saveTodos()
    }
  }

  const deleteTodo = (id: string) => {
    const index = todos.value.findIndex(t => t.id === id)
    if (index > -1) {
      todos.value.splice(index, 1)
      saveTodos()
    }
  }

  const clearCompleted = () => {
    todos.value = todos.value.filter(todo => !todo.completed)
    saveTodos()
  }

  const clearAll = () => {
    todos.value = []
    saveTodos()
  }

  const setFilter = (newFilter: TodoFilter) => {
    filter.value = newFilter
  }

  // 切换置顶状态
  const toggleAlwaysOnTop = async () => {
    const newState = await window.electronAPI.window.toggleAlwaysOnTop()
    alwaysOnTop.value = newState
    return newState
  }

  const getAlwaysOnTop = async () => {
    const state = await window.electronAPI.window.getAlwaysOnTop()
    alwaysOnTop.value = state
    return state
  }

  // 同步到云端
  const syncWithCloud = async () => {
    if (authStore.isLocalMode) return
    
    const result = await authStore.syncData(todos.value)
    
    // 合并云端数据
    if (result.todos && result.todos.length > 0) {
      const cloudTodos = result.todos.map((t: any) => ({
        id: t.id,
        text: t.text,
        completed: t.completed,
        createdAt: new Date(t.created_at).getTime(),
        updatedAt: new Date(t.updated_at).getTime()
      }))
      
      // 合并逻辑：以 updatedAt 为准，取最新的
      const merged = new Map()
      
      // 先加入本地数据
      todos.value.forEach(t => merged.set(t.id, t))
      
      // 再合并云端数据
      cloudTodos.forEach((cloudTodo: Todo) => {
        const localTodo = merged.get(cloudTodo.id)
        if (!localTodo || cloudTodo.updatedAt > localTodo.updatedAt) {
          merged.set(cloudTodo.id, cloudTodo)
        }
      })
      
      todos.value = Array.from(merged.values())
        .filter((t: Todo) => !t.deleted)
        .sort((a: Todo, b: Todo) => b.createdAt - a.createdAt)
      
      saveTodos()
    }
  }

  // 从云端加载
  const loadFromCloud = async () => {
    if (authStore.isLocalMode) {
      loadTodos()
      return
    }
    
    try {
      const cloudTodos = await authStore.fetchCloudTodos()
      if (cloudTodos && cloudTodos.length > 0) {
        todos.value = cloudTodos.map((t: any) => ({
          id: t.id,
          text: t.text,
          completed: t.completed,
          createdAt: new Date(t.created_at).getTime(),
          updatedAt: new Date(t.updated_at).getTime()
        }))
        saveTodos()
      } else {
        loadTodos()
      }
    } catch (error) {
      loadTodos()
    }
  }

  // 初始化
  loadTodos()

  return {
    todos,
    filter,
    alwaysOnTop,
    filteredTodos,
    activeCount,
    completedCount,
    totalCount,
    addTodo,
    toggleTodo,
    editTodo,
    deleteTodo,
    clearCompleted,
    clearAll,
    setFilter,
    loadTodos,
    toggleAlwaysOnTop,
    getAlwaysOnTop,
    syncWithCloud,
    loadFromCloud
  }
})
