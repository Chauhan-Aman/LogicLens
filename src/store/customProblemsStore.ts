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
  updateProblem: (problem: Problem) => Promise<void>;
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

  updateProblem: async (problem) => {
    try {
      const res = await fetch('/api/problems', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problem),
      });
      if (!res.ok) {
        throw new Error('Failed to update problem');
      }
      set((state) => ({
        customProblems: state.customProblems.map((p) =>
          p.id === problem.id ? problem : p
        ),
      }));
    } catch (err) {
      console.error('updateProblem error:', err);
      throw err;
    }
  },

  deleteProblem: async (id) => {
    try {
      const res = await fetch(`/api/problems?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to delete problem');
      }
      set((state) => ({
        customProblems: state.customProblems.filter((p) => p.id !== id),
      }));
    } catch (err) {
      console.error('deleteProblem error:', err);
      throw err;
    }
  },
}));
