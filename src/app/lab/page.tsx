'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ChevronLeft, ChevronRight, Layers, BookOpen, Cpu, GitBranch, X, Plus } from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import CodeEditor from '@/components/lab/CodeEditor';
import ProblemPanel from '@/components/lab/ProblemPanel';
import RightPanel from '@/components/lab/RightPanel';
import ExecutionControls from '@/components/lab/ExecutionControls';
import ProblemCard from '@/components/collection/ProblemCard';
import { useLabStore, type Problem } from '@/store/labStore';
import { useSavedSolutionsStore } from '@/store/savedSolutionsStore';
import { useCustomProblemsStore } from '@/store/customProblemsStore';
import { useTestOverridesStore } from '@/store/testOverridesStore';
import { v4 as uuidv4 } from 'uuid';
import AddProblemModal from '@/components/lab/AddProblemModal';
import { PROBLEMS } from '@/data/index';
import { useMemo } from 'react';
import { formatJsonInput } from '@/utils/formatters';

const DIFFICULTY_FILTERS = ['All', 'Easy', 'Medium', 'Hard'];

export default function LabPage() {
  const { activeProblem, setActiveProblem, setUserCode, setInputJson, setTimeline, setExecutionError, detection, activeLanguage, setActiveLanguage, activeSolution, setActiveSolution } = useLabStore();
  const { savedSolutions, deleteSolution } = useSavedSolutionsStore();
  const { customProblems, addProblem, deleteProblem } = useCustomProblemsStore();
  const { getOverride } = useTestOverridesStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState('All');
  const [showAddProblem, setShowAddProblem] = useState(false);

  // Combine static and custom problems
  const allProblems = useMemo(() => [...PROBLEMS, ...customProblems], [customProblems]);

  const filtered = allProblems.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchDiff = diffFilter === 'All' || p.difficulty === diffFilter;
    return matchSearch && matchDiff;
  });

  const allSolutions = useMemo(() => {
    if (!activeProblem) return [];
    const defaultSols = activeProblem.solutions.map(s => ({ ...s, isSaved: false, id: `default-${s.name}` }));
    const customSols = savedSolutions.filter(s => s.problemId === activeProblem.id).map(s => ({ ...s, isSaved: true }));
    return [...defaultSols, ...customSols].filter(s => s.language === activeLanguage);
  }, [activeProblem, savedSolutions, activeLanguage]);


  function selectProblem(problem: Problem) {
    // For built-in problems, merge any persisted test case overrides
    const override = !problem.tags.includes('Custom') ? getOverride(problem.id) : null;
    const effectiveProblem = override ? { ...problem, testCases: override } : problem;

    setActiveProblem(effectiveProblem);
    
    // Default to C++ solution if available
    let defaultSolIdx = effectiveProblem.solutions.findIndex(s => s.language === 'cpp');
    if (defaultSolIdx === -1) defaultSolIdx = 0;
    
    setActiveSolution(defaultSolIdx);
    setUserCode(effectiveProblem.solutions[defaultSolIdx]?.code ?? '');
    setActiveLanguage(effectiveProblem.solutions[defaultSolIdx]?.language ?? 'javascript');
    if (effectiveProblem.testCases && effectiveProblem.testCases.length > 0) {
      setInputJson(formatJsonInput(effectiveProblem.testCases[0].input));
    } else {
      try {
        setInputJson(formatJsonInput(JSON.parse(effectiveProblem.defaultInput)));
      } catch (e) {
        setInputJson(effectiveProblem.defaultInput);
      }
    }
    setTimeline([]);
    setExecutionError(null);
  }

  function selectSolution(idx: number) {
    if (!allSolutions[idx]) return;
    setActiveSolution(idx);
    setUserCode(allSolutions[idx]?.code ?? '');
    setActiveLanguage(allSolutions[idx]?.language ?? 'javascript');
    setTimeline([]);
    setExecutionError(null);
  }


  return (
    <div className="flex h-screen bg-[#080810] overflow-hidden text-white">
      {/* ─── Sidebar: Problem Collection ─── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex flex-col border-r border-white/8 bg-[#0a0a12] shrink-0 overflow-hidden"
          >
            {/* Logo & Actions */}
            <div className="px-4 py-4 border-b border-white/8 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-black text-xs font-bold">
                  LL
                </div>
                <div>
                  <p className="text-sm font-bold text-white tracking-tight">LogicLens</p>
                  <p className="text-[10px] text-white/30">Algorithm Lab</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddProblem(true)} 
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title="Create Custom Problem"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="px-3 py-3 border-b border-white/5">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="text"
                  placeholder="Search problems..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white/5 rounded-lg text-xs font-mono text-white/70 placeholder-white/20 border border-white/8 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                />
              </div>

              {/* Difficulty filter */}
              <div className="flex gap-1 mt-2">
                {DIFFICULTY_FILTERS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDiffFilter(d)}
                    className={`flex-1 text-[10px] font-medium py-1 rounded-md transition-all ${
                      diffFilter === d
                        ? 'bg-white/15 text-white'
                        : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Problem list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <div className="px-2 py-1.5 flex items-center gap-1.5">
                <Layers size={11} className="text-white/25" />
                <span className="text-[10px] text-white/25 font-mono uppercase tracking-widest">
                  {filtered.length} Problems
                </span>
              </div>
              {filtered.map(p => (
                <ProblemCard
                  key={p.id}
                  problem={p}
                  active={activeProblem?.id === p.id}
                  onSelect={selectProblem}
                  onDelete={p.tags.includes('Custom') ? (prob) => deleteProblem(prob.id) : undefined}
                />
              ))}
            </div>

            {/* Stats footer */}
            <div className="px-4 py-3 border-t border-white/8 flex items-center justify-between">
              <span className="text-[10px] text-white/25 font-mono">{PROBLEMS.length} in collection</span>
              <div className="flex items-center gap-1">
                <GitBranch size={10} className="text-white/20" />
                <span className="text-[10px] text-white/20">v1.0</span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ─── Sidebar toggle ─── */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-5 h-10 bg-white/10 hover:bg-white/20 rounded-r-lg text-white/50 hover:text-white transition-all"
        style={{ left: sidebarOpen ? 320 : 0 }}
      >
        {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* ─── Main Lab Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top nav */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-white/8 bg-[#090912] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-white/40">
              <BookOpen size={13} />
              <span className="text-xs font-mono">
                {activeProblem?.title ?? 'Select a problem'}
              </span>
            </div>
            {detection && (
              <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-white/10">
                <Cpu size={11} className="text-white/50" />
                <div className="flex gap-1">
                  {detection.structures.map(s => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white font-mono capitalize">
                      {s}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] font-mono text-white/50">
                  {detection.estimatedComplexity}
                </span>
              </div>
            )}
          </div>

          {/* Solution selector */}
          {allSolutions.length > 0 && (
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
              {allSolutions.map((sol, i) => (
                <div key={sol.id || i} className={`flex items-center rounded-md transition-all ${
                  activeSolution === i
                    ? 'bg-white text-black'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}>
                  <button
                    onClick={() => selectSolution(i)}
                    className="text-xs px-3 py-1.5 font-medium flex-1 text-left"
                  >
                    {sol.name}
                  </button>
                  {sol.isSaved && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSolution(sol.id);
                        if (activeSolution === i) {
                          selectSolution(0);
                        } else if (activeSolution > i) {
                          setActiveSolution(activeSolution - 1);
                        }
                      }}
                      className="px-2 py-1.5 text-black/50 hover:text-red-500 transition-colors"
                      title="Delete saved solution"
                    >
                      <X size={12} className={activeSolution === i ? "text-black/50 hover:text-red-600" : "text-white/30 hover:text-red-400"} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </header>

        {/* Three-panel layout */}
        <div className="flex-1 min-h-0 overflow-hidden w-full">
          {/* @ts-ignore */}
          <PanelGroup direction="horizontal" className="w-full h-full">
            {/* Left: Problem description */}
            <Panel defaultSize={22} minSize={15} className="flex flex-col overflow-hidden">
              <ProblemPanel problem={activeProblem} />
            </Panel>

            <PanelResizeHandle className="w-2 bg-white/5 hover:bg-white/20 active:bg-white/40 transition-colors cursor-col-resize shrink-0 z-10" />

            {/* Center: Code editor */}
            <Panel defaultSize={48} minSize={30} className="flex flex-col min-w-0 bg-[#0a0a0f]">
              <CodeEditor />
            </Panel>

            <PanelResizeHandle className="w-2 bg-white/5 hover:bg-white/20 active:bg-white/40 transition-colors cursor-col-resize shrink-0 z-10" />

            {/* Right: Visualization & Tabs */}
            <Panel defaultSize={30} minSize={20} className="flex flex-col overflow-hidden bg-[#0a0a12]">
              <RightPanel />
            </Panel>
          </PanelGroup>
        </div>

        {/* Bottom: Execution controls */}
        <div className="shrink-0 border-t border-white/8 bg-[#090912] px-5 py-3">
          <ExecutionControls />
        </div>
      </div>

      <AddProblemModal
        isOpen={showAddProblem}
        onClose={() => setShowAddProblem(false)}
        onSave={(problem) => {
          addProblem(problem);
          selectProblem(problem);
        }}
      />
    </div>
  );
}
