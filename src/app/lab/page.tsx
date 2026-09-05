'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Search, Filter, ChevronLeft, ChevronRight, ChevronDown, Layers, BookOpen, Cpu, GitBranch, X, Plus, Folder, Code, List, Type, Calculator, Network, Database, Hash, Box, Compass, Sparkles } from 'lucide-react';
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
import { useMemo } from 'react';
import { formatJsonInput } from '@/utils/formatters';

const DIFFICULTY_FILTERS = ['All', 'Easy', 'Medium', 'Hard'];

const FOLDER_ICONS: Record<string, any> = {
  'Custom': Sparkles,
  'Array': List,
  'String': Type,
  'Math': Calculator,
  'Tree': Network,
  'Hash Table': Hash,
  'Dynamic Programming': Database,
  'Sorting': Code,
  'Graph': Network,
  'Matrix': Box,
  'Two Pointers': Compass
};

const getFolderIcon = (folderName: string) => {
  const Icon = FOLDER_ICONS[folderName] || Folder;
  return <Icon size={14} className="text-white/60" />;
};

export default function LabPage() {
  const { activeProblem, setActiveProblem, setUserCode, setInputJson, setTimeline, setExecutionError, detection, activeLanguage, setActiveLanguage, activeSolution, setActiveSolution } = useLabStore();
  const { savedSolutions, deleteSolution, loadSolutions } = useSavedSolutionsStore();
  const { customProblems, addProblem, deleteProblem, loadCustomProblems } = useCustomProblemsStore();
  const { getOverride, loadOverrides } = useTestOverridesStore();

  // Load all persistent data from DB on mount
  useEffect(() => {
    loadSolutions();
    loadCustomProblems();
    loadOverrides();
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState('All');
  const [showAddProblem, setShowAddProblem] = useState(false);
  const [solutionToDelete, setSolutionToDelete] = useState<{ id: string, index: number, name: string } | null>(null);

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // All problems now come directly from the database (via customProblemsStore, which we should rename eventually)
  const allProblems = customProblems;

  // Group by folder
  const grouped = useMemo(() => {
    const isSearching = search.trim() !== '';
    const groups: Record<string, Problem[]> = {};
    
    allProblems.forEach(p => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchDiff = diffFilter === 'All' || p.difficulty === diffFilter;
      
      if (matchSearch && matchDiff) {
        const folder = p.tags[0] ?? 'Uncategorized';
        if (!groups[folder]) groups[folder] = [];
        groups[folder].push(p);
      }
    });

    // Auto-expand all if searching
    if (isSearching) {
      const newExpanded = { ...expandedFolders };
      Object.keys(groups).forEach(k => newExpanded[k] = true);
      setExpandedFolders(newExpanded);
    }
    
    return groups;
  }, [allProblems, search, diffFilter]);

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
              <Link href="/" className="flex items-center gap-2.5 group cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-400 flex items-center justify-center text-black text-xs font-bold shadow-md shadow-white/10">
                  LL
                </div>
                <div>
                  <p className="text-sm font-bold text-white tracking-tight">LogicLens</p>
                  <p className="text-[10px] text-white/40 group-hover:text-white transition-colors">← Back to Home</p>
                </div>
              </Link>
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
              <div className="relative group">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="text"
                  placeholder="Search problems..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 bg-white/5 rounded-lg text-xs font-mono text-white/70 placeholder-white/20 border border-white/8 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                />
                <AnimatePresence>
                  {search && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                    >
                      <X size={12} />
                    </motion.button>
                  )}
                </AnimatePresence>
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
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              <div className="px-2 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers size={11} className="text-white/25" />
                  <span className="text-[10px] text-white/25 font-mono uppercase tracking-widest">
                    {Object.values(grouped).flat().length} Problems
                  </span>
                </div>
              </div>

              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([folder, probs]) => {
                const isExpanded = expandedFolders[folder] ?? true; // default expanded
                return (
                  <div key={folder} className="space-y-1">
                    <button
                      onClick={() => setExpandedFolders(prev => ({ ...prev, [folder]: !isExpanded }))}
                      className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-md transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                          {getFolderIcon(folder)}
                        </div>
                        <span className="text-xs font-semibold text-white/70">{folder}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/30">{probs.length}</span>
                        <ChevronDown 
                          size={14} 
                          className={`text-white/40 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                        />
                      </div>
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden space-y-1.5"
                        >
                          {probs.map(p => (
                            <ProblemCard
                              key={p.id}
                              problem={p}
                              active={activeProblem?.id === p.id}
                              onSelect={selectProblem}
                              onDelete={p.tags.includes('Custom') ? (prob) => deleteProblem(prob.id) : undefined}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Stats footer */}
            <div className="px-4 py-3 border-t border-white/8 flex items-center justify-between">
              <span className="text-[10px] text-white/25 font-mono">{allProblems.length} in collection</span>
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
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono capitalize">
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

          <div className="flex items-center gap-2">
            {/* Language Selector Placeholder */}
            <select
              className="bg-[#0a0a0f] border border-zinc-800 text-zinc-400 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-zinc-500 transition-colors cursor-not-allowed"
              disabled
              title="Only C++ and JS are supported currently"
            >
              <option>C++</option>
              <option>JavaScript</option>
            </select>

            {/* Solution selector */}
            {allSolutions.length > 0 && (
              <div className="flex items-center gap-1 bg-[#0a0a0f] border border-zinc-800 rounded-lg p-0.5 shadow-inner">
                {allSolutions.map((sol, i) => (
                  <div key={sol.id || i} className={`flex items-center rounded-md transition-all ${
                    activeSolution === i
                      ? 'bg-white text-black font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
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
                          setSolutionToDelete({ id: sol.id, index: i, name: sol.name });
                        }}
                        className="px-2 py-1.5 text-black/50 hover:text-red-500 transition-colors"
                        title="Delete saved solution"
                      >
                        <X size={12} className={activeSolution === i ? "text-black/50 hover:text-red-600" : "text-white/30 hover:text-red-400"} />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={() => {
                    setActiveSolution(-1);
                    const defaultCode = activeProblem?.solutions[0]?.code || '// Write your new solution here\n';
                    setUserCode(defaultCode);
                  }}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-md transition-colors mx-1"
                  title="New Solution"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>
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
        onSave={async (newProblem) => {
          await addProblem(newProblem);
          setShowAddProblem(false);
          selectProblem(newProblem);
        }}
      />

      {/* Delete Solution Confirmation Modal */}
      <AnimatePresence>
        {solutionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-2xl w-full max-w-sm"
            >
              <h3 className="text-lg font-bold text-white mb-2">Delete Solution</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Are you sure you want to delete <span className="text-white font-semibold">{solutionToDelete.name}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSolutionToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteSolution(solutionToDelete.id);
                    if (activeSolution === solutionToDelete.index) {
                      selectSolution(0);
                    } else if (activeSolution > solutionToDelete.index) {
                      setActiveSolution(activeSolution - 1);
                    }
                    setSolutionToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold rounded-lg border border-red-500/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
