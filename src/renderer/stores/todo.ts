import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Todo, TodoFilter } from '../types/todo'

// 生成唯一ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

// 本地存储键名
const STORAGE_KEY = 'lzuea-todo-items'

export const useTodoStore = defineStore('todo', () => {
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
    setFilter,
    loadTodos,
    toggleAlwaysOnTop,
    getAlwaysOnTop
  }
})
