import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Problem } from '@/store/labStore';

interface CustomProblemsState {
  customProblems: Problem[];
  addProblem: (problem: Problem) => void;
  updateProblem: (problem: Problem) => void;
  deleteProblem: (id: string) => void;
}

export const useCustomProblemsStore = create<CustomProblemsState>()(
  persist(
    (set) => ({
      customProblems: [],
      addProblem: (problem) =>
        set((state) => ({
          customProblems: [...state.customProblems, problem],
        })),
      updateProblem: (problem) =>
        set((state) => ({
          customProblems: state.customProblems.map((p) => p.id === problem.id ? problem : p),
        })),
      deleteProblem: (id) =>
        set((state) => ({
          customProblems: state.customProblems.filter((p) => p.id !== id),
        })),
    }),
    {
      name: 'logiclens-custom-problems',
    }
  )
);
