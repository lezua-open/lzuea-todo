import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3001/api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref(localStorage.getItem('todo_token') || '')
  const user = ref(JSON.parse(localStorage.getItem('todo_user') || 'null'))
  const isLocalMode = ref(localStorage.getItem('todo_local_mode') === 'true')
  const lastSyncAt = ref(localStorage.getItem('todo_last_sync') || '')

  // Getters
  const isLoggedIn = computed(() => !!token.value || isLocalMode.value)
  const currentUser = computed(() => user.value)

  // Actions
  const setLocalMode = () => {
    isLocalMode.value = true
    localStorage.setItem('todo_local_mode', 'true')
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      })
      
      token.value = response.data.token
      user.value = response.data.user
      isLocalMode.value = false
      
      localStorage.setItem('todo_token', response.data.token)
      localStorage.setItem('todo_user', JSON.stringify(response.data.user))
      localStorage.setItem('todo_local_mode', 'false')
      
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '登录失败')
    }
  }

  const register = async (username: string, password: string, email?: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        username,
        password,
        email
      })
      
      token.value = response.data.token
      user.value = response.data.user
      isLocalMode.value = false
      
      localStorage.setItem('todo_token', response.data.token)
      localStorage.setItem('todo_user', JSON.stringify(response.data.user))
      localStorage.setItem('todo_local_mode', 'false')
      
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '注册失败')
    }
  }

  const logout = () => {
    token.value = ''
    user.value = null
    isLocalMode.value = false
    localStorage.removeItem('todo_token')
    localStorage.removeItem('todo_user')
    localStorage.removeItem('todo_local_mode')
  }

  const syncData = async (localTodos: any[]) => {
    if (isLocalMode.value || !token.value) {
      return { todos: localTodos }
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/sync`,
        {
          todos: localTodos,
          lastSyncAt: lastSyncAt.value
        },
        {
          headers: { Authorization: `Bearer ${token.value}` }
        }
      )

      lastSyncAt.value = response.data.syncedAt
      localStorage.setItem('todo_last_sync', response.data.syncedAt)

      return response.data
    } catch (error: any) {
      if (error.response?.status === 401) {
        logout()
        throw new Error('登录已过期，请重新登录')
      }
      throw new Error(error.response?.data?.error || '同步失败')
    }
  }

  const fetchCloudTodos = async () => {
    if (isLocalMode.value || !token.value) {
      return []
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/todos`, {
        headers: { Authorization: `Bearer ${token.value}` }
      })
      return response.data.todos
    } catch (error: any) {
      if (error.response?.status === 401) {
        logout()
      }
      return []
    }
  }

  return {
    token,
    user,
    isLocalMode,
    lastSyncAt,
    isLoggedIn,
    currentUser,
    setLocalMode,
    login,
    register,
    logout,
    syncData,
    fetchCloudTodos
  }
})
