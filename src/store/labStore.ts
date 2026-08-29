/**
 * Global Zustand store for the LogicLens execution lab.
 */

import { create } from 'zustand';
import type { StateSnapshot } from '@/engine/events';
import type { DetectionResult } from '@/engine/detector';
import type { TestResult } from '@/engine/testRunner';

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
  testCases?: {
    input: Record<string, unknown>;
    expected: unknown;
    exactOrder?: boolean;
  }[];
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
  activeLanguage: string;
  setActiveLanguage: (lang: string) => void;
  activeSolution: number;
  setActiveSolution: (idx: number) => void;

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

  // Test Results
  testResults: TestResult[];
  setTestResults: (results: TestResult[]) => void;
}

export const useLabStore = create<LabState>((set) => ({
  activeProblem: null,
  setActiveProblem: (p) => set({ activeProblem: p }),

  userCode: '',
  setUserCode: (code) => set({ userCode: code }),
  inputJson: '{}',
  setInputJson: (json) => set({ inputJson: json }),
  activeLanguage: 'javascript',
  setActiveLanguage: (lang) => set({ activeLanguage: lang }),
  activeSolution: 0,
  setActiveSolution: (idx) => set({ activeSolution: idx }),

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

  testResults: [],
  setTestResults: (results) => set({ testResults: results }),
}));
