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
import { generateExpectedOutput } from '@/engine/llmClient';
import TestResultsPanel from './TestResultsPanel';
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
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [expectedJson, setExpectedJson] = useState('');
  
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
      const result = await executeCode(userCode, inputJson, activeLanguage, activeProblem?.id);

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

      const results = await runAllTests(userCode, activeProblem.testCases, activeLanguage, activeProblem.id);
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
      const defaultSols = activeProblem.solutions.filter(s => s.language === activeLanguage);
      const customSols = savedSolutions.filter(s => s.problemId === activeProblem.id && s.language === activeLanguage);
      const numDefaultsForLang = defaultSols.length;
      
      let codeToLoad = '';
      if (activeSolution !== undefined && activeSolution >= numDefaultsForLang) {
        // Load a custom saved solution
        const customIdx = activeSolution - numDefaultsForLang;
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
        setActiveTab(0);
        setInputJson(formatJsonInput(activeProblem.testCases[0].input));
        setExpectedJson(activeProblem.testCases[0].expected !== null && activeProblem.testCases[0].expected !== undefined ? JSON.stringify(activeProblem.testCases[0].expected) : '');
      } else {
        setActiveTab(null);
        setInputJson('{\n  \n}');
        setExpectedJson('');
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
      
      const defaultSols = activeProblem.solutions.filter(s => s.language === activeLanguage);
      const customSols = savedSolutions.filter(s => s.problemId === activeProblem.id && s.language === activeLanguage);
      const numDefaultsForLang = defaultSols.length;

      if (activeSolution >= numDefaultsForLang) {
        const customIdx = activeSolution - numDefaultsForLang;
        if (customSols[customIdx]) {
           updateSolution(customSols[customIdx].id, userCode);
           // Show a brief toast or notification if we want, but saving silently is fine
           return;
        }
      }
      setShowSaveModal(true);
    };
  }, [userCode, activeProblem, activeLanguage, savedSolutions, updateSolution]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
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
                setUserCode(solution ? solution.code : `// Write your ${lang === 'cpp' ? 'C++' : 'JavaScript'} solution here...`);
                setTimeline([]);
                setExecutionError(null);
              }
            }}
            className="ml-2 bg-black/40 border border-white/10 text-white/70 text-xs rounded px-2 py-0.5 outline-none focus:border-white/30"
          >
            <option value="javascript">JavaScript</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        <div className="flex items-center gap-2 relative">
          {showSaveModal && (
            <div className="absolute top-10 right-0 z-50 bg-[#1e1e24] border border-white/10 rounded-lg shadow-xl shadow-black/50 p-3 w-64 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-xs font-semibold text-white/80 mb-2">Save Solution</div>
              <input 
                type="text" 
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && saveName.trim() && activeProblem) {
                    saveSolution({
                      problemId: activeProblem.id,
                      name: saveName.trim(),
                      language: activeLanguage,
                      code: userCode,
                    });
                    const numDefaults = activeProblem.solutions.length;
                    const numCustom = savedSolutions.filter(s => s.problemId === activeProblem.id).length;
                    setActiveSolution(numDefaults + numCustom);
                    setShowSaveModal(false);
                    setSaveName('');
                  } else if (e.key === 'Escape') {
                    setShowSaveModal(false);
                  }
                }}
                autoFocus
                placeholder="e.g. Optimized HashMap"
                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50 mb-3"
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setShowSaveModal(false)}
                  className="px-3 py-1 text-[11px] font-medium text-white/50 hover:text-white/80 rounded transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (saveName.trim() && activeProblem) {
                      saveSolution({
                        problemId: activeProblem.id,
                        name: saveName.trim(),
                        language: activeLanguage,
                        code: userCode,
                      });
                      const numDefaults = activeProblem.solutions.length;
                      const numCustom = savedSolutions.filter(s => s.problemId === activeProblem.id).length;
                      setActiveSolution(numDefaults + numCustom);
                      setShowSaveModal(false);
                      setSaveName('');
                    }
                  }}
                  disabled={!saveName.trim()}
                  className="px-3 py-1 text-[11px] font-medium bg-emerald-500 text-black rounded hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}
          
          <button
            onClick={() => {
              if (saveCommandRef.current) saveCommandRef.current();
            }}
            disabled={!userCode.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-all duration-150 disabled:opacity-50"
          >
            <Save size={12} />
            Save
          </button>
          <button
            onClick={() => editorRef.current?.getAction('editor.action.formatDocument')?.run()}
            disabled={!userCode.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all duration-150 disabled:opacity-50"
          >
            <AlignLeft size={12} />
            Format
          </button>
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
      <div className="flex-1 min-h-[10rem] shrink-0">
        <MonacoEditor
          height="100%"
          language={activeLanguage === 'cpp' ? 'cpp' : 'javascript'}
          path={`${activeProblem?.id || 'default'}-${activeLanguage}-${activeSolution || 0}`}
          value={userCode}
          onChange={(v) => setUserCode(v ?? '')}
          options={MONACO_OPTIONS}
          onMount={handleEditorMount}
        />
      </div>

      {/* Input panel */}
      <div className="border-t border-white/8 bg-black/20 flex flex-col shrink-0">
        <div className="px-4 py-2 flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-white/30 uppercase tracking-widest mr-2">Input</span>
            {activeProblem?.testCases?.map((tc, idx) => {
              const isActive = activeTab === idx;
              return (
                <div key={idx} className={`flex items-center gap-0 rounded text-[10px] transition-colors ${isActive ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}>
                  <button
                    onClick={() => {
                      setActiveTab(idx);
                      setInputJson(formatJsonInput(tc.input));
                      setExpectedJson(tc.expected !== null && tc.expected !== undefined ? JSON.stringify(tc.expected) : '');
                    }}
                    className={`px-3 py-1 ${isActive ? 'text-white' : 'text-white/50'}`}
                  >
                    Test {idx + 1}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newCases = (activeProblem.testCases ?? []).filter((_, i) => i !== idx);
                      applyTestCaseChange(newCases);
                      if (activeTab === idx) {
                        setActiveTab(null);
                        if (newCases.length > 0) {
                          const nextIdx = Math.min(idx, newCases.length - 1);
                          setActiveTab(nextIdx);
                          setInputJson(formatJsonInput(newCases[nextIdx].input));
                          setExpectedJson(newCases[nextIdx].expected !== null ? JSON.stringify(newCases[nextIdx].expected) : '');
                        }
                      } else if (activeTab !== null && activeTab > idx) {
                        setActiveTab(activeTab - 1);
                      }
                    }}
                    title="Delete this test case"
                    className={`pr-2 pl-0.5 py-1 text-white/20 hover:text-red-400 transition-colors ${isActive ? 'text-white/40' : ''}`}
                  >
                    <X size={9} />
                  </button>
                </div>
              );
            })}

            <span className="text-xs text-white/15 ml-2 mr-2">JSON</span>
            {activeProblem && (
              <button
                onClick={() => {
                  try {
                    const currentInput = JSON.parse(inputJson);
                    const newTestCase = { input: currentInput, expected: null };
                    const newCases = [...(activeProblem.testCases || []), newTestCase];
                    applyTestCaseChange(newCases);
                    const newIdx = newCases.length - 1;
                    setActiveTab(newIdx);
                    setExpectedJson('');
                  } catch (e) {
                    alert('Invalid JSON! Please format the input as valid JSON before saving as a test case.');
                  }
                }}
                title="Save current JSON as new Test Case"
                className="flex items-center justify-center w-5 h-5 rounded bg-white/5 hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400 transition-colors"
              >
                +
              </button>
            )}
          </div>
          <button
            disabled={isGeneratingRandom}
            onClick={async () => {
              if (isGeneratingRandom) return;
              setActiveTab(null);
              setIsGeneratingRandom(true);
              try {
                let currentInput = JSON.parse(inputJson);
                
                // If input is empty, borrow structure from the first test case
                if (Object.keys(currentInput).length === 0 && activeProblem?.testCases && activeProblem.testCases.length > 0) {
                  currentInput = JSON.parse(JSON.stringify(activeProblem.testCases[0].input));
                }

                const generateRandomValue = (val: any): any => {
                  if (typeof val === 'number') {
                     return Math.floor(Math.random() * 100);
                  } else if (typeof val === 'string') {
                     const chars = 'abcdefghijklmnopqrstuvwxyz';
                     const len = Math.floor(Math.random() * 5) + 3;
                     let s = '';
                     for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
                     return s;
                  } else if (Array.isArray(val)) {
                     const len = Math.floor(Math.random() * 5) + 3;
                     if (val.length > 0) {
                        return Array.from({ length: len }, () => generateRandomValue(val[0]));
                     } else {
                        return Array.from({ length: len }, () => Math.floor(Math.random() * 20));
                     }
                  } else if (typeof val === 'boolean') {
                     return Math.random() > 0.5;
                  }
                  return val;
                };

                for (const key in currentInput) {
                  currentInput[key] = generateRandomValue(currentInput[key]);
                }
                
                const currentInputJsonStr = JSON.stringify(currentInput, null, 2);
                setInputJson(currentInputJsonStr);

                // Run LLM to find mathematically correct expected output
                let expectedOutput = null;
                try {
                  if (activeProblem) {
                    expectedOutput = await generateExpectedOutput(activeProblem.title, activeProblem.description, currentInputJsonStr);
                  }
                } catch (llmError) {
                  console.warn("LLM failed to generate expected output:", llmError);
                  // Fallback: try running the user code if LLM fails
                  const correctCode = activeProblem?.solutions[0]?.code || userCode;
                  const execResult = await executeCode(correctCode, currentInputJsonStr, activeLanguage, activeProblem?.id || '');
                  expectedOutput = execResult.error ? null : execResult.returnValue;
                }
                
                setExpectedJson(expectedOutput !== null ? JSON.stringify(expectedOutput) : '');
                
                if (activeProblem) {
                   const newTestCase = { input: currentInput, expected: expectedOutput };
                   const newCases = [...(activeProblem.testCases || []), newTestCase];
                   applyTestCaseChange(newCases);
                   setActiveTab(newCases.length - 1);
                }
              } catch (e) {
                console.error("Invalid JSON for generation");
                alert("Please ensure the current input is valid JSON before randomizing.");
              } finally {
                setIsGeneratingRandom(false);
              }
            }}
            className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white/50 hover:text-white transition-colors shrink-0 ml-4 disabled:opacity-50"
          >
            {isGeneratingRandom ? 'Generating...' : 'Generate Random Test Case'}
          </button>
        </div>
        <textarea
          value={inputJson}
          onChange={(e) => {
            setInputJson(e.target.value);
            setActiveTab(null);
          }}
          placeholder='{ "nums": [2, 7, 11, 15], "target": 9 }'
          rows={activeTab !== null ? 5 : 10}
          className="w-full px-4 pb-3 bg-transparent font-mono text-xs text-white/60 placeholder-white/20 resize-y min-h-[5rem] focus:outline-none"
        />

        {/* Expected output editor — shown when a test tab is selected */}
        {activeTab !== null && (
          <div className="border-t border-white/5 px-4 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Expected Output</span>
              <button
                onClick={() => {
                  if (!activeProblem?.testCases) return;
                  try {
                    const parsedExpected = expectedJson.trim() === '' ? null : JSON.parse(expectedJson);
                    const newCases = activeProblem.testCases.map((tc, i) =>
                      i === activeTab ? { ...tc, expected: parsedExpected } : tc
                    );
                    applyTestCaseChange(newCases);
                  } catch {
                    alert('Invalid JSON for expected output.');
                  }
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
              >
                Save Expected
              </button>
            </div>
            <textarea
              value={expectedJson}
              onChange={(e) => setExpectedJson(e.target.value)}
              placeholder="e.g. 2  or  [0, 1]  or  true"
              rows={3}
              className="w-full bg-transparent font-mono text-xs text-white/60 placeholder-white/20 resize-y min-h-[3rem] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Test Results */}
      <TestResultsPanel />
    </div>
  );
}
