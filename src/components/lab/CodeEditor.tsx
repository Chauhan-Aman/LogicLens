'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Play, RotateCcw, Cpu, Save, X, AlignLeft } from 'lucide-react';
import { useLabStore } from '@/store/labStore';
import { useSavedSolutionsStore } from '@/store/savedSolutionsStore';
import { useCustomProblemsStore } from '@/store/customProblemsStore';
import { useTestOverridesStore } from '@/store/testOverridesStore';
import { executeCode } from '@/engine/executor';
import { buildTimeline } from '@/engine/stateEngine';
import { detectStructures } from '@/engine/detector';
import { runAllTests } from '@/engine/testRunner';
import TestResultsPanel from './TestResultsPanel';
import CodeEditorHeader from './CodeEditorHeader';
import TestCaseEditor from './TestCaseEditor';
import { formatJsonInput } from '@/utils/formatters';

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
    setActiveProblem,
    activeLanguage,
    setActiveLanguage,
    activeSolution,
    setActiveSolution,
  } = useLabStore();
  
  const { saveSolution, updateSolution, savedSolutions } = useSavedSolutionsStore();
  const { updateProblem } = useCustomProblemsStore();
  const { setOverride } = useTestOverridesStore();

  const [isRunning, setIsRunning] = useState(false);
  const [isGeneratingRandom, setIsGeneratingRandom] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  
  const editorRef = useRef<any>(null);

  // Helper: mutate test cases on the active problem and persist
  function applyTestCaseChange(newTestCases: NonNullable<typeof activeProblem>['testCases']) {
    if (!activeProblem) return;
    const updatedProblem = { ...activeProblem, testCases: newTestCases };
    setActiveProblem(updatedProblem);
    if (activeProblem.tags.includes('Custom')) {
      updateProblem(updatedProblem);
    } else {
      // Persist overrides for built-in problems
      setOverride(activeProblem.id, newTestCases ?? []);
    }
  }

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
  }, [userCode, inputJson, activeLanguage, setTimeline, setDetection, setExecutionError, activeProblem]);

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
        setInputJson(formatJsonInput(firstFailure.input));
        if (firstFailure.error) {
          setExecutionError(firstFailure.error);
          setTimeline([]);
        } else {
          setTimeline(firstFailure.timeline);
        }
      } else if (results.length > 0) {
        // Load the first passing test if all passed
        setInputJson(formatJsonInput(results[0].input));
        setTimeline(results[0].timeline);
      }

    } catch (e) {
      setExecutionError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRunningAll(false);
    }
  }, [userCode, activeProblem, activeLanguage, setTimeline, setDetection, setExecutionError, setInputJson]);

  useEffect(() => {
    // Sync editor code when active problem/language changes
    if (activeProblem) {
      const defaultSols = activeProblem.solutions;
      const customSols = savedSolutions.filter(s => s.problemId === activeProblem.id);
      const numDefaults = defaultSols.length;
      
      if (activeSolution === -1) return; // Allow draft mode to retain its userCode
      
      let codeToLoad = '';
      if (activeSolution !== undefined && activeSolution >= numDefaults) {
        // Load a custom saved solution
        const customIdx = activeSolution - numDefaults;
        if (customSols[customIdx]) {
          codeToLoad = customSols[customIdx].code;
        }
      } else {
        // Load default solution
        const solIdx = activeSolution !== undefined ? activeSolution : 0;
        const solution = defaultSols[solIdx] || defaultSols[0];
        codeToLoad = solution ? solution.code : `// Write your ${activeLanguage === 'cpp' ? 'C++' : 'JavaScript'} solution here...`;
      }
      
      setUserCode(codeToLoad);
      setTimeline([]);
      setExecutionError(null);

      // Load first test case if available
      if (activeProblem.testCases && activeProblem.testCases.length > 0) {
        setInputJson(formatJsonInput(activeProblem.testCases[0].input));
      } else {
        setInputJson('{\n  \n}');
      }
    }
  }, [activeProblem, activeSolution]); // Re-run if activeProblem or activeSolution changes

  function handleEditorMount(editor: unknown, monaco: unknown) {
    editorRef.current = editor;
    const monacoInstance = monaco as any;

    // Register custom dark theme
    monacoInstance.editor.defineTheme('logiclens-dark', {
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

    // Register basic C++ formatter if not already registered
    if (!monacoInstance.languages.getLanguages().some((l: any) => l.id === 'cpp_formatted')) {
      monacoInstance.languages.registerDocumentFormattingEditProvider('cpp', {
        provideDocumentFormattingEdits(model: any) {
          const code = model.getValue();
          let s = code.replace(/\r\n/g, '\n'); // Normalize windows line endings
          
          // Add newline after { if there isn't one
          s = s.replace(/\{[ \t]*([^\n}])/g, '{\n$1');
          // Add newline before } if there isn't one
          s = s.replace(/([^\n{])[ \t]*\}/g, '$1\n}');
          
          // Condense 3+ newlines into 2 newlines (1 empty line)
          s = s.replace(/\n[ \t]*\n([ \t]*\n)+/g, '\n\n');

          let indent = 0;
          const lines = s.split('\n');
          const formatted = lines.map((line: string) => {
            const trimmed = line.trim();
            if (!trimmed) return ''; // Preserve single empty lines
            
            // Decrease indent for closing braces
            if (trimmed.startsWith('}')) {
              indent = Math.max(0, indent - 1);
            }
            
            let currentIndent = indent;
            // Access modifiers should be outdented by 1 level
            if (trimmed.startsWith('public:') || trimmed.startsWith('private:') || trimmed.startsWith('protected:')) {
              currentIndent = Math.max(0, indent - 1);
            }
            
            const result = '    '.repeat(currentIndent) + trimmed;
            
            // Increase indent for opening braces
            if (trimmed.endsWith('{')) {
              indent++;
            }
            
            return result;
          }).join('\n'); // Do not filter(Boolean) so empty lines are preserved

          return [
            {
              range: model.getFullModelRange(),
              text: formatted
            }
          ];
        }
      });
      monacoInstance.languages.register({ id: 'cpp_formatted' }); // Dummy to mark as registered
    }

    (editor as any).addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      if (saveCommandRef.current) {
        saveCommandRef.current();
      }
    });
  }

  const saveCommandRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    saveCommandRef.current = () => {
      if (!userCode.trim() || !activeProblem) return;
      const { activeSolution } = useLabStore.getState();
      
      const defaultSols = activeProblem.solutions;
      const customSols = savedSolutions.filter(s => s.problemId === activeProblem.id);
      const numDefaults = defaultSols.length;

      if (activeSolution >= numDefaults && activeSolution !== -1) {
        const customIdx = activeSolution - numDefaults;
        if (customSols[customIdx]) {
           updateSolution(customSols[customIdx].id, userCode);
           return;
        }
      } else if (activeSolution < numDefaults && activeSolution !== -1) {
        // Update the default solution's code
        const updatedProblem = { ...activeProblem };
        updatedProblem.solutions = [...updatedProblem.solutions];
        updatedProblem.solutions[activeSolution] = {
          ...updatedProblem.solutions[activeSolution],
          code: userCode
        };
        useCustomProblemsStore.getState().updateProblem(updatedProblem);
        useLabStore.getState().setActiveProblem(updatedProblem);
        return;
      }
      
      setShowSaveModal(true);
    };
  }, [userCode, activeProblem, activeLanguage, savedSolutions, updateSolution]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] border-r border-white/8">
      <CodeEditorHeader 
        isRunning={isRunning}
        isRunningAll={isRunningAll}
        onRun={run}
        onRunAll={handleRunAllTests}
        onFormat={() => editorRef.current?.getAction('editor.action.formatDocument')?.run()}
        onClear={() => setUserCode('')}
        onSaveCommand={() => {
          if (saveCommandRef.current) saveCommandRef.current();
        }}
        showSaveModal={showSaveModal}
        setShowSaveModal={setShowSaveModal}
        saveName={saveName}
        setSaveName={setSaveName}
      />

      <div className="flex-1 min-h-[10rem] shrink-0">
        <MonacoEditor
          key={`${activeProblem?.id || 'default'}-${activeLanguage}-${activeSolution || 0}`}
          height="100%"
          language={activeLanguage === 'cpp' ? 'cpp' : 'javascript'}
          path={`${activeProblem?.id || 'default'}-${activeLanguage}-${activeSolution || 0}`}
          value={userCode}
          onChange={(v) => setUserCode(v ?? '')}
          options={MONACO_OPTIONS}
          onMount={handleEditorMount}
        />
      </div>

      <TestCaseEditor 
        isGeneratingRandom={isGeneratingRandom}
        setIsGeneratingRandom={setIsGeneratingRandom}
      />

      {/* Test Results */}
      <TestResultsPanel />
    </div>
  );
}

