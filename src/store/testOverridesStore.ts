/**
 * Test overrides store - syncs with DB via /api/test-overrides
 */
import { create } from 'zustand';

type TestCase = {
  input: Record<string, unknown>;
  expected: unknown;
  exactOrder?: boolean;
};

interface TestOverridesState {
  overrides: Record<string, TestCase[]>;
  isLoaded: boolean;
  loadOverrides: () => Promise<void>;
  setOverride: (problemId: string, testCases: TestCase[]) => Promise<void>;
  getOverride: (problemId: string) => TestCase[] | null;
  clearOverride: (problemId: string) => void;
}

export const useTestOverridesStore = create<TestOverridesState>((set, get) => ({
  overrides: {},
  isLoaded: false,

  loadOverrides: async () => {
    if (get().isLoaded) return;
    try {
      const res = await fetch('/api/test-overrides');
      if (!res.ok) throw new Error('Failed to load test overrides');
      const data: Record<string, TestCase[]> = await res.json();
      set({ overrides: data, isLoaded: true });
    } catch (err) {
      console.error('loadOverrides error:', err);
    }
  },

  setOverride: async (problemId, testCases) => {
    // Optimistically update local state
    set((state) => ({ overrides: { ...state.overrides, [problemId]: testCases } }));
    try {
      await fetch('/api/test-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, testCases }),
      });
    } catch (err) {
      console.error('setOverride error:', err);
    }
  },

  getOverride: (problemId) => {
    return get().overrides[problemId] ?? null;
  },

  clearOverride: (problemId) => {
    set((state) => {
      const newOverrides = { ...state.overrides };
      delete newOverrides[problemId];
      return { overrides: newOverrides };
    });
  },
}));
