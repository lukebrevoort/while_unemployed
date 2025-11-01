import { create } from 'zustand'

interface InterviewState {
  sessionId: string | null
  isRecording: boolean
  recordedBlob: Blob | null
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  setSessionId: (id: string) => void
  setIsRecording: (recording: boolean) => void
  setRecordedBlob: (blob: Blob | null) => void
  addMessage: (role: 'user' | 'assistant', content: string) => void
  clearConversation: () => void
}

export const useInterviewStore = create<InterviewState>((set) => ({
  sessionId: null,
  isRecording: false,
  recordedBlob: null,
  conversationHistory: [],

  setSessionId: (id) => set({ sessionId: id }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  setRecordedBlob: (blob) => set({ recordedBlob: blob }),

  addMessage: (role, content) =>
    set((state) => ({
      conversationHistory: [...state.conversationHistory, { role, content }],
    })),

  clearConversation: () => set({ conversationHistory: [] }),
}))
