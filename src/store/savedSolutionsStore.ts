import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedSolution {
  id: string;
  problemId: string;
  name: string;
  language: string;
  code: string;
  timestamp: number;
}

interface SavedSolutionsState {
  savedSolutions: SavedSolution[];
  saveSolution: (solution: Omit<SavedSolution, 'id' | 'timestamp'>) => void;
  updateSolution: (id: string, code: string) => void;
  deleteSolution: (id: string) => void;
}

export const useSavedSolutionsStore = create<SavedSolutionsState>()(
  persist(
    (set) => ({
      savedSolutions: [],
      saveSolution: (solution) => set((state) => ({
        savedSolutions: [
          ...state.savedSolutions,
          {
            ...solution,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
          }
        ]
      })),
      updateSolution: (id, code) => set((state) => ({
        savedSolutions: state.savedSolutions.map((s) => 
          s.id === id ? { ...s, code, timestamp: Date.now() } : s
        ),
      })),
      deleteSolution: (id) => set((state) => ({
        savedSolutions: state.savedSolutions.filter((s) => s.id !== id),
      })),
    }),
    {
      name: 'logiclens-saved-solutions',
    }
  )
);
