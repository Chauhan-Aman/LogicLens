/**
 * Persists test case overrides for built-in problems.
 * When a user adds/deletes/edits test cases on a built-in problem,
 * those changes are stored here and merged on load.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TestCase = {
  input: Record<string, unknown>;
  expected: unknown;
  exactOrder?: boolean;
};

interface ProblemTestOverride {
  problemId: string;
  testCases: TestCase[];
}

interface TestOverridesState {
  overrides: ProblemTestOverride[];
  setOverride: (problemId: string, testCases: TestCase[]) => void;
  getOverride: (problemId: string) => TestCase[] | null;
  clearOverride: (problemId: string) => void;
}

export const useTestOverridesStore = create<TestOverridesState>()(
  persist(
    (set, get) => ({
      overrides: [],
      setOverride: (problemId, testCases) =>
        set((state) => {
          const existing = state.overrides.filter((o) => o.problemId !== problemId);
          return { overrides: [...existing, { problemId, testCases }] };
        }),
      getOverride: (problemId) => {
        const match = get().overrides.find((o) => o.problemId === problemId);
        return match ? match.testCases : null;
      },
      clearOverride: (problemId) =>
        set((state) => ({
          overrides: state.overrides.filter((o) => o.problemId !== problemId),
        })),
    }),
    { name: 'logiclens-test-overrides' }
  )
);
