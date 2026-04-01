export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  isLoading?: boolean;
}

export interface StreamEvent {
  type: 'meta' | 'delta' | 'done';
  session_id?: string;
  sources?: string[];
  content?: string;
}

