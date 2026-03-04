<template>
  <AuthView v-if="!isLoggedIn" />
  <div v-else class="app-container">
    <!-- 标题栏 -->
    <div class="title-bar">
      <div class="title">
        <span class="title-icon">✓</span>
        <span>Lzuea Todo</span>
        <a-tag v-if="authStore.isLocalMode" color="orange">本地模式</a-tag>
        <a-tag v-else-if="authStore.user" color="blue">{{ authStore.user.username }}</a-tag>
      </div>
      <div class="window-controls">
        <a-button 
          type="text" 
          size="small"
          class="control-btn"
          :class="{ active: alwaysOnTop }"
          @click="handleToggleAlwaysOnTop"
          title="置顶"
        >
          <pushpin-outlined />
        </a-button>
        <a-button 
          type="text" 
          size="small"
          class="control-btn sync"
          :class="{ 'syncing': isSyncing }"
          @click="handleSync"
          :disabled="isSyncing || authStore.isLocalMode"
          title="同步"
        >
          <sync-outlined :spin="isSyncing" />
        </a-button>
        <a-button 
          type="text" 
          size="small"
          class="control-btn"
          @click="handleLogout"
          title="退出登录"
        >
          <logout-outlined />
        </a-button>
        <a-button 
          type="text" 
          size="small"
          class="control-btn minimize"
          @click="handleMinimize"
          title="最小化"
        >
          <minus-outlined />
        </a-button>
        <a-button 
          type="text" 
          size="small"
          class="control-btn close"
          @click="handleClose"
          title="隐藏到托盘"
        >
          <close-outlined />
        </a-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 输入框 -->
      <div class="input-section">
        <a-input
          v-model:value="newTodoText"
          placeholder="添加新任务..."
          size="large"
          @pressEnter="handleAddTodo"
          class="todo-input"
        >
          <template #prefix>
            <plus-outlined />
          </template>
          <template #suffix>
            <a-button 
              type="primary" 
              size="small"
              @click="handleAddTodo"
              :disabled="!newTodoText.trim()"
            >
              添加
            </a-button>
          </template>
        </a-input>
      </div>

      <!-- 过滤器 -->
      <div class="filter-section">
        <a-radio-group 
          v-model:value="filter" 
          size="small"
          button-style="solid"
          @change="handleFilterChange"
        >
          <a-radio-button value="all">
            全部 ({{ totalCount }})
          </a-radio-button>
          <a-radio-button value="active">
            待办 ({{ activeCount }})
          </a-radio-button>
          <a-radio-button value="completed">
            已完成 ({{ completedCount }})
          </a-radio-button>
        </a-radio-group>
        
        <a-button
          v-if="completedCount > 0"
          type="link"
          size="small"
          danger
          @click="handleClearCompleted"
          class="clear-btn"
        >
          <delete-outlined />
          清空已完成
        </a-button>
      </div>

      <!-- 任务列表 -->
      <div class="todo-list">
        <div v-if="filteredTodos.length === 0" class="empty-state">
          <inbox-outlined class="empty-icon" />
          <p>{{ emptyText }}</p>
        </div>
        
        <transition-group name="todo" tag="div">
          <TodoItem
            v-for="todo in filteredTodos"
            :key="todo.id"
            :todo="todo"
            @toggle="handleToggle"
            @edit="handleEdit"
            @delete="handleDelete"
          />
        </transition-group>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar">
      <span>{{ activeCount }} 个待办任务</span>
      <span v-if="alwaysOnTop" class="pin-indicator">📌 置顶中</span>
      <span v-if="lastSyncTime" class="sync-indicator">🔄 {{ lastSyncTime }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useTodoStore } from './stores/todo'
import { useAuthStore } from './stores/auth'
import AuthView from './views/AuthView.vue'
import TodoItem from './components/TodoItem.vue'
import {
  PlusOutlined,
  PushpinOutlined,
  MinusOutlined,
  CloseOutlined,
  DeleteOutlined,
  InboxOutlined,
  SyncOutlined,
  LogoutOutlined
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import type { TodoFilter } from './types/todo'

const todoStore = useTodoStore()
const authStore = useAuthStore()
const newTodoText = ref('')
const isSyncing = ref(false)
const lastSyncTime = ref('')

// 计算属性
const isLoggedIn = computed(() => authStore.isLoggedIn)
const filter = computed({
  get: () => todoStore.filter,
  set: (val) => todoStore.setFilter(val)
})

const alwaysOnTop = computed(() => todoStore.alwaysOnTop)
const filteredTodos = computed(() => todoStore.filteredTodos)
const activeCount = computed(() => todoStore.activeCount)
const completedCount = computed(() => todoStore.completedCount)
const totalCount = computed(() => todoStore.totalCount)

const emptyText = computed(() => {
  switch (filter.value) {
    case 'active':
      return '暂无待办任务，休息一下吧~'
    case 'completed':
      return '还没有完成的任务'
    default:
      return '还没有任务，添加一个吧！'
  }
})

// 方法
const handleAddTodo = () => {
  if (newTodoText.value.trim()) {
    todoStore.addTodo(newTodoText.value)
    newTodoText.value = ''
  }
}

const handleToggle = (id: string) => {
  todoStore.toggleTodo(id)
}

const handleEdit = (id: string, text: string) => {
  todoStore.editTodo(id, text)
}

const handleDelete = (id: string) => {
  todoStore.deleteTodo(id)
}

const handleClearCompleted = () => {
  todoStore.clearCompleted()
}

const handleFilterChange = (e: any) => {
  todoStore.setFilter(e.target.value as TodoFilter)
}

// 窗口控制
const handleMinimize = () => {
  window.electronAPI.window.minimize()
}

const handleClose = () => {
  window.electronAPI.window.close()
}

const handleToggleAlwaysOnTop = async () => {
  await todoStore.toggleAlwaysOnTop()
}

// 同步功能
const handleSync = async () => {
  if (authStore.isLocalMode) {
    message.info('本地模式下无法同步')
    return
  }
  
  isSyncing.value = true
  try {
    await todoStore.syncWithCloud()
    lastSyncTime.value = new Date().toLocaleTimeString()
    message.success('同步成功！')
  } catch (error: any) {
    message.error(error.message || '同步失败')
  } finally {
    isSyncing.value = false
  }
}

// 登出
const handleLogout = () => {
  Modal.confirm({
    title: '确认退出？',
    content: '退出后将返回登录页面',
    onOk: () => {
      authStore.logout()
      todoStore.clearAll()
      message.success('已退出登录')
    }
  })
}

// 自动同步
const autoSync = async () => {
  if (authStore.isLocalMode || !authStore.token) return
  
  try {
    await todoStore.syncWithCloud()
    lastSyncTime.value = new Date().toLocaleTimeString()
  } catch (error) {
    console.error('自动同步失败:', error)
  }
}

onMounted(() => {
  todoStore.getAlwaysOnTop()
  
  // 登录后加载数据并同步
  if (authStore.isLoggedIn && !authStore.isLocalMode) {
    todoStore.loadFromCloud()
    autoSync()
  }
  
  // 每 5 分钟自动同步
  setInterval(autoSync, 5 * 60 * 1000)
})

// 监听登录状态变化
watch(() => authStore.isLoggedIn, (newVal) => {
  if (newVal && !authStore.isLocalMode) {
    todoStore.loadFromCloud()
  }
})
</script>

<style scoped>
/* 原有样式保持不变，添加新样式 */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 标题栏 */
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  -webkit-app-region: drag;
  user-select: none;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.title-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  font-size: 14px;
}

.window-controls {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.control-btn {
  color: white !important;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.control-btn.active {
  background: rgba(255, 255, 255, 0.3) !important;
  color: #ffd700 !important;
}

.control-btn.sync {
  color: #90EE90 !important;
}

.control-btn.syncing {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.control-btn.minimize:hover {
  background: rgba(255, 193, 7, 0.3) !important;
}

.control-btn.close:hover {
  background: rgba(244, 67, 54, 0.3) !important;
}

/* 主内容 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.input-section {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.todo-input :deep(.ant-input) {
  border-radius: 8px;
}

/* 过滤器 */
.filter-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.clear-btn {
  margin-left: 8px;
}

/* 任务列表 */
.todo-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* 状态栏 */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #f5f5f5;
  border-top: 1px solid #e8e8e8;
  font-size: 12px;
  color: #666;
}

.pin-indicator {
  color: #667eea;
  font-weight: 500;
}

.sync-indicator {
  color: #52c41a;
  font-weight: 500;
}

/* 动画 */
.todo-enter-active,
.todo-leave-active {
  transition: all 0.3s ease;
}

.todo-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.todo-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* 滚动条 */
.todo-list::-webkit-scrollbar {
  width: 6px;
}

.todo-list::-webkit-scrollbar-track {
  background: transparent;
}

.todo-list::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.todo-list::-webkit-scrollbar-thumb:hover {
  background: #b3b3b3;
}
</style>
