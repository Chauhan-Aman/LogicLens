'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Play, RotateCcw, Cpu } from 'lucide-react';
import { useLabStore } from '@/store/labStore';
import { executeCode } from '@/engine/executor';
import { buildTimeline } from '@/engine/stateEngine';
import { detectStructures } from '@/engine/detector';
import { runAllTests } from '@/engine/testRunner';
import TestResultsPanel from './TestResultsPanel';

// Monaco editor is SSR-incompatible, load client-side only
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(m => m.default),
  { ssr: false, loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0d0d0d] text-white/30 text-sm font-mono">
      Loading editor...
    </div>
  )}
);

const MONACO_OPTIONS = {
  fontSize: 13,
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  lineNumbers: 'on' as const,
  renderLineHighlight: 'all' as const,
  cursorBlinking: 'smooth' as const,
  smoothScrolling: true,
  padding: { top: 16, bottom: 16 },
  theme: 'logiclens-dark',
};

export default function CodeEditor() {
  const {
    userCode,
    setUserCode,
    inputJson,
    setInputJson,
    setTimeline,
    setDetection,
    setExecutionError,
    activeProblem,
    activeLanguage,
    setActiveLanguage,
  } = useLabStore();

  const [isRunning, setIsRunning] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const run = useCallback(async () => {
    if (!userCode.trim()) return;
    setIsRunning(true);
    setExecutionError(null);

    try {
      // Detect structures
      const detection = detectStructures(userCode);
      setDetection(detection);

      // Execute
      const result = await executeCode(userCode, inputJson, activeLanguage);

      if (result.error) {
        setExecutionError(result.error);
        setTimeline([]);
      } else {
        const timeline = buildTimeline(result.events);
        setTimeline(timeline);
      }
    } catch (e) {
      setExecutionError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRunning(false);
    }
  }, [userCode, inputJson, activeLanguage, setTimeline, setDetection, setExecutionError]);

  const handleRunAllTests = useCallback(async () => {
    if (!userCode.trim() || !activeProblem?.testCases) return;
    setIsRunningAll(true);
    setExecutionError(null);
    useLabStore.getState().setTestResults([]);

    try {
      // Detect structures on first run
      setDetection(detectStructures(userCode));

      const results = await runAllTests(userCode, activeProblem.testCases, activeLanguage);
      useLabStore.getState().setTestResults(results);

      // If there are failures, load the first failure into visualizer
      const firstFailure = results.find(r => !r.passed);
      if (firstFailure) {
        setInputJson(JSON.stringify(firstFailure.input, null, 2));
        if (firstFailure.error) {
          setExecutionError(firstFailure.error);
          setTimeline([]);
        } else {
          setTimeline(firstFailure.timeline);
        }
      } else if (results.length > 0) {
        // Load the first passing test if all passed
        setInputJson(JSON.stringify(results[0].input, null, 2));
        setTimeline(results[0].timeline);
      }

    } catch (e) {
      setExecutionError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRunningAll(false);
    }
  }, [userCode, activeProblem, activeLanguage, setTimeline, setDetection, setExecutionError, setInputJson]);

  function handleEditorMount(editor: unknown, monaco: unknown) {
    // Register custom dark theme
    (monaco as { editor: { defineTheme: (name: string, opts: unknown) => void } }).editor.defineTheme('logiclens-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '4a5568', fontStyle: 'italic' },
        { token: 'keyword', foreground: '7c3aed' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'identifier', foreground: 'e2e8f0' },
      ],
      colors: {
        'editor.background': '#0a0a0f',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#ffffff08',
        'editorLineNumber.foreground': '#2d3748',
        'editorCursor.foreground': '#7c3aed',
        'editor.selectionBackground': '#7c3aed33',
      },
    });
    (editor as { updateOptions: (opts: unknown) => void }).updateOptions({ theme: 'logiclens-dark' });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-2 text-xs font-mono text-white/30">
            {activeProblem?.title ?? 'Untitled'}
          </span>
          <select 
            value={activeLanguage}
            onChange={(e) => {
              const lang = e.target.value;
              setActiveLanguage(lang);
              if (activeProblem) {
                const solution = activeProblem.solutions.find(s => s.language === lang);
                if (solution) {
                  setUserCode(solution.code);
                  setTimeline([]);
                  setExecutionError(null);
                }
              }
            }}
            className="ml-2 bg-black/40 border border-white/10 text-white/70 text-xs rounded px-2 py-0.5 outline-none focus:border-white/30"
          >
            <option value="javascript">JavaScript</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUserCode('')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all duration-150"
          >
            <RotateCcw size={12} />
            Clear
          </button>
          <button
            onClick={run}
            disabled={isRunning || isRunningAll || !userCode.trim()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <><Cpu size={14} className="animate-spin" /> Running...</>
            ) : (
              <><Play size={14} /> Run Current</>
            )}
          </button>
          
          {activeProblem?.testCases && (
            <button
              onClick={handleRunAllTests}
              disabled={isRunning || isRunningAll || !userCode.trim()}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold bg-white hover:bg-gray-200 text-black shadow-lg shadow-white/10 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunningAll ? (
                <><Cpu size={14} className="animate-spin" /> Testing...</>
              ) : (
                <><Play size={14} /> Run All Tests</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={activeLanguage === 'cpp' ? 'cpp' : 'javascript'}
          value={userCode}
          onChange={(v) => setUserCode(v ?? '')}
          options={MONACO_OPTIONS}
          onMount={handleEditorMount}
        />
      </div>

      {/* Input panel */}
      <div className="border-t border-white/8 bg-black/20 flex flex-col shrink-0">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white/30 uppercase tracking-widest">Input</span>
            <span className="text-xs text-white/15">JSON</span>
          </div>
          <button
            onClick={() => {
              try {
                const currentInput = JSON.parse(inputJson);
                // Simple randomizer for arrays
                for (const key in currentInput) {
                  if (Array.isArray(currentInput[key])) {
                    currentInput[key] = Array.from({ length: Math.floor(Math.random() * 5) + 4 }, () => Math.floor(Math.random() * 20));
                  }
                }
                setInputJson(JSON.stringify(currentInput, null, 2));
              } catch (e) {
                console.error("Invalid JSON for generation");
              }
            }}
            className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white/50 hover:text-white transition-colors"
          >
            Generate Random Test Case
          </button>
        </div>
        <textarea
          value={inputJson}
          onChange={(e) => setInputJson(e.target.value)}
          placeholder='{ "nums": [2, 7, 11, 15], "target": 9 }'
          rows={4}
          className="w-full px-4 pb-3 bg-transparent font-mono text-xs text-white/60 placeholder-white/20 resize-y min-h-[4rem] max-h-[20rem] focus:outline-none"
        />
      </div>

      {/* Test Results */}
      <TestResultsPanel />
    </div>
  );
}
