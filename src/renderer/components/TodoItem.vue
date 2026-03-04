<template>
  <div 
    class="todo-item"
    :class="{ completed: todo.completed, editing: isEditing }"
  >
    <a-checkbox
      :checked="todo.completed"
      @change="handleToggle"
      class="todo-checkbox"
    >
      <template #default>
        <span v-if="!isEditing" class="todo-text" @dblclick="startEdit">
          {{ todo.text }}
        </span>
        <a-input
          v-else
          v-model:value="editText"
          size="small"
          class="edit-input"
          @pressEnter="handleSave"
          @blur="handleSave"
          ref="editInput"
        />
      </template>
    </a-checkbox>

    <div class="todo-actions">
      <a-button
        v-if="!isEditing"
        type="text"
        size="small"
        class="action-btn edit"
        @click="startEdit"
        title="编辑"
      >
        <edit-outlined />
      </a-button>
      
      <a-button
        type="text"
        size="small"
        class="action-btn delete"
        @click="handleDelete"
        title="删除"
      >
        <delete-outlined />
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import type { Todo } from '../types/todo'

interface Props {
  todo: Todo
}

const props = defineProps<Props>()
const emit = defineEmits<{
  toggle: [id: string]
  edit: [id: string, text: string]
  delete: [id: string]
}>()

const isEditing = ref(false)
const editText = ref('')
const editInput = ref()

const handleToggle = () => {
  emit('toggle', props.todo.id)
}

const startEdit = () => {
  isEditing.value = true
  editText.value = props.todo.text
  nextTick(() => {
    editInput.value?.focus()
  })
}

const handleSave = () => {
  if (isEditing.value) {
    const trimmed = editText.value.trim()
    if (trimmed && trimmed !== props.todo.text) {
      emit('edit', props.todo.id, trimmed)
    }
    isEditing.value = false
  }
}

const handleDelete = () => {
  emit('delete', props.todo.id)
}
</script>

<style scoped>
.todo-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 6px;
  background: white;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;
}

.todo-item:hover {
  border-color: #d9d9d9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: #999;
}

.todo-item.editing {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.todo-checkbox {
  flex: 1;
  display: flex;
  align-items: center;
}

.todo-checkbox :deep(.ant-checkbox) {
  top: 0;
}

.todo-text {
  margin-left: 8px;
  cursor: pointer;
  user-select: none;
  word-break: break-all;
  line-height: 1.5;
}

.todo-text:hover {
  color: #667eea;
}

.edit-input {
  flex: 1;
  margin-left: 8px;
}

.todo-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.todo-item:hover .todo-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.action-btn.edit {
  color: #1890ff;
}

.action-btn.edit:hover {
  background: #e6f7ff;
}

.action-btn.delete {
  color: #ff4d4f;
}

.action-btn.delete:hover {
  background: #fff1f0;
}
</style>
