<template>
  <div class="chat-page">
    <a-card :bordered="false" class="chat-card">
      <template #title>
        <div class="chat-header">
          <a-space :size="10" align="center">
            <div class="chat-title-icon">
              <MessageSquareIcon :size="18" />
            </div>
            <div class="flex flex-col">
              <a-typography-text strong class="text-[14px]">智能对话</a-typography-text>
              <a-typography-text type="secondary" class="text-[12px]">
                支持 RAG 检索与流式输出
              </a-typography-text>
            </div>
            <a-tag color="blue">RAG</a-tag>
            <a-tag color="green">Streaming</a-tag>
            <a-tag v-if="sending" color="processing">生成中</a-tag>
          </a-space>

          <a-space :size="8" align="center">
            <a-typography-text type="secondary" class="text-[12px]">Session</a-typography-text>
            <a-input v-model:value="sessionId" size="small" class="session-input" placeholder="default" />
            <a-tooltip title="清空对话记录并停止生成">
              <a-button size="small" danger @click="resetSession">重置</a-button>
            </a-tooltip>
          </a-space>
        </div>
      </template>

      <div class="chat-body">
        <div ref="scrollEl" class="chat-scroll">
          <div v-if="messages.length === 0" class="chat-empty">
            <a-empty :image="Empty.PRESENTED_IMAGE_SIMPLE" description="">
              <template #description>
                <div class="flex flex-col items-center gap-2">
                  <a-typography-text class="text-slate-500">输入问题开始与 AI 对话吧</a-typography-text>
                  <a-typography-text type="secondary" class="text-[12px]">
                    也可以点击下面的示例问题快速开始
                  </a-typography-text>
                </div>
              </template>
            </a-empty>

            <div class="example-questions">
              <a-typography-text strong class="text-[12px] text-slate-600">示例问题</a-typography-text>
              <div class="mt-2">
                <a-space wrap :size="8">
                  <a-button
                    v-for="q in exampleQuestions"
                    :key="q"
                    size="small"
                    class="example-btn"
                    @click="useExampleQuestion(q)"
                  >
                    {{ q }}
                  </a-button>
                </a-space>
              </div>
            </div>
          </div>

          <ChatMessageItem v-for="m in messages" :key="m.id" :message="m" />
        </div>

        <div class="chat-composer">
          <a-space direction="vertical" :size="10" class="w-full">
            <a-textarea
              v-model:value="input"
              :auto-size="{ minRows: 1, maxRows: 4 }"
              placeholder="输入你的问题...（Enter 发送，Shift + Enter 换行）"
              :disabled="sending"
              @pressEnter="handleEnter"
            />

            <div class="composer-actions">
              <a-space :size="8" wrap>
                <a-dropdown :trigger="['click']">
                  <a-button size="small">
                    示例问题
                    <DownOutlined />
                  </a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item v-for="q in exampleQuestions" :key="q" @click="useExampleQuestion(q)">
                        {{ q }}
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>

                <a-tooltip title="清空当前输入">
                  <a-button size="small" :disabled="!input" @click="input = ''">清空输入</a-button>
                </a-tooltip>
              </a-space>

              <div class="flex-1" />

              <a-space :size="8">
                <a-button v-if="!sending" type="primary" :disabled="!input.trim()" @click="send">
                  <template #icon>
                    <SendOutlined />
                  </template>
                  发送
                </a-button>
                <a-button v-else danger @click="cancel">
                  <template #icon>
                    <StopOutlined />
                  </template>
                  停止
                </a-button>
              </a-space>
            </div>

            <a-typography-text type="secondary" class="text-[10px] text-center">
              由 FastAPI + Vue3 + RAG 驱动
            </a-typography-text>
          </a-space>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { MessageSquareIcon } from 'lucide-vue-next'
import { Empty } from 'ant-design-vue'
import { SendOutlined, StopOutlined, DownOutlined } from '@ant-design/icons-vue'
import ChatMessageItem from '../components/ChatMessageItem.vue'
import { chatStream } from '../api/chat'
import type { ChatMessage, StreamEvent } from '../types/chat'

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const sessionId = ref('default')
const input = ref('')
const messages = ref<ChatMessage[]>([])
const sending = ref(false)
const scrollEl = ref<HTMLDivElement | null>(null)

const exampleQuestions = [
  '什么是 RAG 技术？',
  '如何使用 FastAPI 构建流式接口？',
  'Vue3 的组合式 API 有什么优势？',
  '介绍一下 Ant Design Vue 的特点。'
]

function useExampleQuestion(q: string) {
  input.value = q
}

let aborter: AbortController | null = null

function scrollToBottom(smooth = false) {
  const el = scrollEl.value
  if (!el) return
  if (smooth && 'scrollTo' in el) {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    return
  }
  el.scrollTop = el.scrollHeight
}

function handleEnter(e: KeyboardEvent) {
  if (e.shiftKey) return // 允许换行
  e.preventDefault()
  send()
}

async function resetSession() {
  if (sending.value) cancel()
  messages.value = []
  await nextTick()
  scrollToBottom()
}

async function send() {
  const q = input.value.trim()
  if (!q || sending.value) return

  const userMsg: ChatMessage = {
    id: uid(),
    role: 'user',
    content: q,
  }

  const assistantMsg: ChatMessage = {
    id: uid(),
    role: 'assistant',
    content: '',
    sources: [],
    isLoading: true,
  }

  messages.value.push(userMsg)
  messages.value.push(assistantMsg)
  input.value = ''
  sending.value = true

  aborter = new AbortController()

  try {
    await chatStream(
      q,
      sessionId.value || 'default',
      (evt: StreamEvent) => {
        const idx = messages.value.findIndex((m) => m.id === assistantMsg.id)
        if (idx === -1) return

        if (evt.type === 'meta') {
          messages.value[idx] = {
            ...messages.value[idx],
            sources: evt.sources ?? [],
          }
          return
        }
        if (evt.type === 'delta') {
          messages.value[idx] = {
            ...messages.value[idx],
            content: messages.value[idx].content + (evt.content ?? ''),
          }
          nextTick(() => scrollToBottom(true))
          return
        }
        if (evt.type === 'done') {
          messages.value[idx] = {
            ...messages.value[idx],
            isLoading: false,
          }
        }
      },
      { signal: aborter.signal }
    )
  } catch (e: any) {
    const idx = messages.value.findIndex((m) => m.id === assistantMsg.id)
    if (idx !== -1) {
      const current = messages.value[idx]
      messages.value[idx] = {
        ...current,
        isLoading: false,
        content:
          e.name === 'AbortError'
            ? current.content + '\n\n[已停止生成]'
            : current.content || '请求失败，请检查后端服务是否启动。',
      }
    }
  } finally {
    sending.value = false
    aborter = null
    await nextTick()
    scrollToBottom()
  }
}

function cancel() {
  if (aborter) aborter.abort()
}

onBeforeUnmount(() => {
  cancel()
})

watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    scrollToBottom()
  }
)
</script>

<style scoped>
:deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 !important;
}

.chat-page {
  max-width: 1040px;
  margin: 0 auto;
}

.chat-card {
  overflow: hidden;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.chat-title-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(22, 119, 255, 0.12);
  color: #1677ff;
}

.session-input {
  width: 140px;
}

.chat-body {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px - 48px - 48px);
  min-height: 680px;
}

.chat-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px 16px 10px;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.chat-scroll::-webkit-scrollbar {
  width: 10px;
}

.chat-scroll::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border-radius: 999px;
  border: 3px solid transparent;
  background-clip: content-box;
}

.chat-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.example-questions {
  width: min(720px, 100%);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 14px;
}

.example-btn {
  border-radius: 999px;
}

.chat-composer {
  padding: 14px 16px 16px;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}

.composer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
