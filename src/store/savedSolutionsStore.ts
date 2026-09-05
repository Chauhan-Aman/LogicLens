/**
 * Saved solutions store - syncs with DB via /api/solutions
 */
import { create } from 'zustand';

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
  isLoaded: boolean;
  loadSolutions: () => Promise<void>;
  saveSolution: (solution: Omit<SavedSolution, 'id' | 'timestamp'>) => Promise<void>;
  updateSolution: (id: string, code: string) => Promise<void>;
  deleteSolution: (id: string) => Promise<void>;
}

export const useSavedSolutionsStore = create<SavedSolutionsState>((set, get) => ({
  savedSolutions: [],
  isLoaded: false,

  loadSolutions: async () => {
    if (get().isLoaded) return;
    try {
      const res = await fetch('/api/solutions');
      if (!res.ok) throw new Error('Failed to load solutions');
      const data = await res.json();
      set({ savedSolutions: data, isLoaded: true });
    } catch (err) {
      console.error('loadSolutions error:', err);
    }
  },

  saveSolution: async (solution) => {
    try {
      const res = await fetch('/api/solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solution),
      });
      if (!res.ok) throw new Error('Failed to save solution');
      const created: SavedSolution = await res.json();
      set((state) => ({ savedSolutions: [...state.savedSolutions, created] }));
    } catch (err) {
      console.error('saveSolution error:', err);
      throw err;
    }
  },

  updateSolution: async (id, code) => {
    try {
      const res = await fetch('/api/solutions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, code }),
      });
      if (!res.ok) throw new Error('Failed to update solution');
      const { timestamp } = await res.json();
      set((state) => ({
        savedSolutions: state.savedSolutions.map((s) =>
          s.id === id ? { ...s, code, timestamp } : s
        ),
      }));
    } catch (err) {
      console.error('updateSolution error:', err);
    }
  },

  deleteSolution: async (id) => {
    try {
      const res = await fetch(`/api/solutions?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete solution');
      set((state) => ({
        savedSolutions: state.savedSolutions.filter((s) => s.id !== id),
      }));
    } catch (err) {
      console.error('deleteSolution error:', err);
    }
  },
}));
