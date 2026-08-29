import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GeneratedConcept {
  problemConcept: string;
  optimalConcept: string;
  graphic?: string[];
}

export interface ChatMessage {
  role: 'user' | 'tutor';
  content: string;
}

interface AIState {
  concepts: Record<string, GeneratedConcept>;
  chatHistories: Record<string, ChatMessage[]>;
  saveConcept: (problemId: string, concept: GeneratedConcept) => void;
  addChatMessage: (problemId: string, message: ChatMessage) => void;
  clearChatHistory: (problemId: string) => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      concepts: {},
      chatHistories: {},
      saveConcept: (problemId, concept) => 
        set((state) => ({
          concepts: { ...state.concepts, [problemId]: concept }
        })),
      addChatMessage: (problemId, message) =>
        set((state) => {
          const history = state.chatHistories[problemId] || [];
          return {
            chatHistories: { ...state.chatHistories, [problemId]: [...history, message] }
          };
        }),
      clearChatHistory: (problemId) =>
        set((state) => {
          const newHistories = { ...state.chatHistories };
          delete newHistories[problemId];
          return { chatHistories: newHistories };
        })
    }),
    {
      name: 'logiclens-ai-storage',
    }
  )
);
