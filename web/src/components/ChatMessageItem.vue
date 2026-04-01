<template>
  <div class="chat-message-item mb-6" :class="[message.role === 'user' ? 'message-user' : 'message-assistant']">
    <div class="flex items-start gap-3" :class="message.role === 'user' ? 'flex-row-reverse' : 'flex-row'">
      <!-- 头像 -->
      <a-avatar :size="40" :style="{ backgroundColor: message.role === 'user' ? '#1677ff' : '#87d068' }" class="flex items-center justify-center">
        <template #icon>
          <div class="flex items-center justify-center w-full h-full">
            <UserIcon v-if="message.role === 'user'" :size="20" />
            <BotIcon v-else :size="20" />
          </div>
        </template>
      </a-avatar>

      <!-- 消息内容区 -->
      <div class="flex flex-col max-w-[80%]" :class="message.role === 'user' ? 'items-end' : 'items-start'">
        <div class="mb-1 flex items-center gap-2 text-[12px] text-slate-400 px-1">
          <span class="font-medium text-slate-500">{{ message.role === 'user' ? '你' : 'AI 助手' }}</span>
          <a-tag v-if="message.isLoading" color="processing" size="small" class="m-0 border-none bg-transparent">
            <template #icon>
              <SyncOutlined spin />
            </template>
            思考中...
          </a-tag>
        </div>

        <div
          class="message-bubble relative p-3 rounded-2xl shadow-sm"
          :class="[
            message.role === 'user'
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
          ]"
        >
          <template v-if="message.role === 'assistant'">
            <div class="markdown-body" v-html="assistantHtml"></div>
            <!-- 流式光标 -->
            <span v-if="message.isLoading" class="typing-cursor"></span>
          </template>
          <template v-else>
            <div class="whitespace-pre-wrap text-[14px] leading-relaxed">{{ message.content }}</div>
          </template>
        </div>

        <!-- 来源展示 -->
        <div v-if="message.role === 'assistant' && message.sources?.length" class="mt-2 w-full">
          <a-collapse :bordered="false" ghost size="small">
            <a-collapse-panel key="sources">
              <template #header>
                <div class="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-500 transition-colors">
                  <LibraryIcon :size="12" />
                  <span>{{ message.sources.length }} 条参考来源</span>
                </div>
              </template>
              <div class="flex flex-wrap gap-2 pt-1 px-2">
                <a-tag v-for="s in message.sources" :key="s" color="blue" class="text-[10px] m-0 border-blue-100">
                  {{ s }}
                </a-tag>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LibraryIcon, UserIcon, BotIcon } from 'lucide-vue-next'
import { SyncOutlined } from '@ant-design/icons-vue'
import type { ChatMessage } from '../types/chat'
import { renderMarkdown } from '../utils/markdown'

const props = defineProps<{
  message: ChatMessage
}>()

const assistantHtml = computed(() => renderMarkdown(props.message.content))
</script>

<style scoped>
.message-bubble {
  transition: all 0.2s ease;
  min-height: 40px;
  border:none;
}

.message-user .message-bubble {
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.15);
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  background-color: #1677ff;
  margin-left: 4px;
  animation: blink 1s infinite;
  vertical-align: middle;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

:deep(.markdown-body) {
  font-size: 14px;
  line-height: 1.6;
}

:deep(.markdown-body p) {
  margin-bottom: 0.5em;
}

:deep(.markdown-body p:last-child) {
  margin-bottom: 0;
}

:deep(.ant-collapse-header) {
  padding: 0 !important;
}

:deep(.ant-collapse-content-box) {
  padding: 4px 0 !important;
}
</style>
