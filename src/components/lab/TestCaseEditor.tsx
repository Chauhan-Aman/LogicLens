import { useState } from 'react';
import { X } from 'lucide-react';
import { useLabStore, type Problem } from '@/store/labStore';
import { useCustomProblemsStore } from '@/store/customProblemsStore';
import { useTestOverridesStore } from '@/store/testOverridesStore';
import { generateExpectedOutput } from '@/engine/llmClient';
import { executeCode } from '@/engine/executor';
import { formatJsonInput } from '@/utils/formatters';

interface TestCaseEditorProps {
  isGeneratingRandom: boolean;
  setIsGeneratingRandom: (v: boolean) => void;
}

export default function TestCaseEditor({ isGeneratingRandom, setIsGeneratingRandom }: TestCaseEditorProps) {
  const { activeProblem, setActiveProblem, userCode, activeLanguage, inputJson, setInputJson } = useLabStore();
  const { updateProblem } = useCustomProblemsStore();
  const { setOverride } = useTestOverridesStore();

  const [activeTab, setActiveTab] = useState<number | null>(0);
  const [expectedJson, setExpectedJson] = useState('');

  // Helper: mutate test cases on the active problem and persist
  function applyTestCaseChange(newTestCases: NonNullable<Problem>['testCases']) {
    if (!activeProblem) return;
    const updatedProblem = { ...activeProblem, testCases: newTestCases };
    setActiveProblem(updatedProblem);
    if (activeProblem.tags.includes('Custom')) {
      updateProblem(updatedProblem);
    } else {
      setOverride(activeProblem.id, newTestCases ?? []);
    }
  }

  return (
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

              let expectedOutput = null;
              try {
                if (activeProblem) {
                  expectedOutput = await generateExpectedOutput(activeProblem.title, activeProblem.description, currentInputJsonStr);
                }
              } catch (llmError) {
                console.warn("LLM failed:", llmError);
                const correctCode = activeProblem?.solutions[0]?.code || userCode;
                const execResult = await executeCode(correctCode, currentInputJsonStr, activeLanguage);
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
              console.error("Invalid JSON");
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
  );
}
