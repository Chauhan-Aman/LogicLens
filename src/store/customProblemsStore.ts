/**
 * Custom problems store - syncs with DB via /api/problems
 */
import { create } from 'zustand';
import type { Problem } from '@/store/labStore';

interface CustomProblemsState {
  customProblems: Problem[];
  isLoaded: boolean;
  loadCustomProblems: () => Promise<void>;
  addProblem: (problem: Problem) => Promise<void>;
  updateProblem: (problem: Problem) => void;
  deleteProblem: (id: string) => Promise<void>;
}

export const useCustomProblemsStore = create<CustomProblemsState>((set, get) => ({
  customProblems: [],
  isLoaded: false,

  loadCustomProblems: async () => {
    if (get().isLoaded) return;
    try {
      const res = await fetch('/api/problems');
      if (!res.ok) throw new Error('Failed to load problems');
      const data: Problem[] = await res.json();
      set({ customProblems: data, isLoaded: true });
    } catch (err) {
      console.error('loadCustomProblems error:', err);
    }
  },

  addProblem: async (problem) => {
    try {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problem),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save problem');
      }
      set((state) => ({ customProblems: [...state.customProblems, problem] }));
    } catch (err) {
      console.error('addProblem error:', err);
      throw err;
    }
  },

  updateProblem: (problem) => {
    set((state) => ({
      customProblems: state.customProblems.map((p) =>
        p.id === problem.id ? problem : p
      ),
    }));
  },

  deleteProblem: async (id) => {
    // Note: no DELETE API yet for problems - could add later
    set((state) => ({
      customProblems: state.customProblems.filter((p) => p.id !== id),
    }));
  },
}));
