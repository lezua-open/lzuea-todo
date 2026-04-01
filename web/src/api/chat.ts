import type { StreamEvent } from '../types/chat'

export interface ChatStreamOptions {
  apiBaseUrl?: string
  signal?: AbortSignal
}

const DEFAULT_API_BASE_URL = ''

export async function chatStream(
  question: string,
  sessionId: string,
  onEvent: (event: StreamEvent) => void,
  options: ChatStreamOptions = {}
) {
  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL

  console.log('[SSE] Starting request:', { question, sessionId })

  const response = await fetch(`${apiBaseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      session_id: sessionId,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let currentEventData = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      console.log('[SSE] Reader done')
      break
    }

    // 1. 解码新到达的数据块
    const chunk = decoder.decode(value, { stream: true })
    
    // 2. 按行处理（处理 \r\n 或 \n）
    const lines = chunk.split(/\r?\n/)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') {
          onEvent({ type: 'done' })
          continue
        }
        currentEventData = payload // 这里假设 data 是单行的，后端目前确实是单行发送
      } else if (line === '' && currentEventData) {
        // 3. 遇到空行且有积累的数据，说明一个事件结束了
        try {
          const evt = JSON.parse(currentEventData) as StreamEvent
          console.log('[SSE] Received event:', evt)
          onEvent(evt)
        } catch (e) {
          console.error('[SSE] Failed to parse JSON:', currentEventData)
        }
        currentEventData = ''
      }
    }
  }
}
