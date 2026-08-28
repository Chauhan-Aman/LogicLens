/**
 * Global Zustand store for the LogicLens execution lab.
 */

import { create } from 'zustand';
import type { StateSnapshot } from '@/engine/events';
import type { DetectionResult } from '@/engine/detector';

export interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  description: string;
  examples: { input: string; output: string }[];
  solutions: {
    name: string;
    complexity: { time: string; space: string };
    language: string;
    code: string;
  }[];
  structures: string[];
  defaultInput: string;
}

interface LabState {
  // Problem
  activeProblem: Problem | null;
  setActiveProblem: (p: Problem | null) => void;

  // Code
  userCode: string;
  setUserCode: (code: string) => void;
  inputJson: string;
  setInputJson: (json: string) => void;

  // Execution
  timeline: StateSnapshot[];
  setTimeline: (t: StateSnapshot[]) => void;
  currentStep: number;
  setCurrentStep: (s: number) => void;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  playSpeed: number;
  setPlaySpeed: (v: number) => void;

  // Detection
  detection: DetectionResult | null;
  setDetection: (d: DetectionResult | null) => void;

  // Error
  executionError: string | null;
  setExecutionError: (e: string | null) => void;
}

export const useLabStore = create<LabState>((set) => ({
  activeProblem: null,
  setActiveProblem: (p) => set({ activeProblem: p }),

  userCode: '',
  setUserCode: (code) => set({ userCode: code }),
  inputJson: '{}',
  setInputJson: (json) => set({ inputJson: json }),

  timeline: [],
  setTimeline: (t) => set({ timeline: t, currentStep: 0 }),
  currentStep: 0,
  setCurrentStep: (s) => set({ currentStep: s }),
  isPlaying: false,
  setIsPlaying: (v) => set({ isPlaying: v }),
  playSpeed: 1,
  setPlaySpeed: (v) => set({ playSpeed: v }),

  detection: null,
  setDetection: (d) => set({ detection: d }),

  executionError: null,
  setExecutionError: (e) => set({ executionError: e }),
}));
