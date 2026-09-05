import { useState } from 'react';
import { Play, RotateCcw, Cpu, Save, AlignLeft, X } from 'lucide-react';
import { useLabStore } from '@/store/labStore';
import { useSavedSolutionsStore } from '@/store/savedSolutionsStore';

interface CodeEditorHeaderProps {
  isRunning: boolean;
  isRunningAll: boolean;
  onRun: () => void;
  onRunAll: () => void;
  onFormat: () => void;
  onClear: () => void;
  onSaveCommand?: () => void;
  showSaveModal: boolean;
  setShowSaveModal: (val: boolean) => void;
  saveName: string;
  setSaveName: (val: string) => void;
}

export default function CodeEditorHeader({
  isRunning,
  isRunningAll,
  onRun,
  onRunAll,
  onFormat,
  onClear,
  onSaveCommand,
  showSaveModal,
  setShowSaveModal,
  saveName,
  setSaveName
}: CodeEditorHeaderProps) {
  const { userCode, activeProblem, activeLanguage, setActiveSolution } = useLabStore();
  const { saveSolution, savedSolutions } = useSavedSolutionsStore();

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-black/20 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-xs font-semibold text-white/70 uppercase tracking-wider font-mono">
          Code Editor
        </span>
      </div>
      <div className="flex items-center gap-2 relative">
        {showSaveModal && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-[#1a1a24] border border-white/10 rounded-lg shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-white/80 uppercase">Save Solution</span>
              <button onClick={() => setShowSaveModal(false)} className="text-white/40 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <input
              autoFocus
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
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
            if (onSaveCommand) onSaveCommand();
            else setShowSaveModal(true);
          }}
          disabled={!userCode.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-all duration-150 disabled:opacity-50"
        >
          <Save size={12} />
          Save
        </button>
        <button
          onClick={onFormat}
          disabled={!userCode.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all duration-150 disabled:opacity-50"
        >
          <AlignLeft size={12} />
          Format
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all duration-150"
        >
          <RotateCcw size={12} />
          Clear
        </button>
        <button
          onClick={onRun}
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
            onClick={onRunAll}
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
  );
}
