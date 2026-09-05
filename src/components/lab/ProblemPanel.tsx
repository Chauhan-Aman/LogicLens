'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLabStore } from '@/store/labStore';
import type { Problem } from '@/store/labStore';
import { useCustomProblemsStore } from '@/store/customProblemsStore';

interface ProblemPanelProps {
  problem: Problem | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy:   'text-emerald-300/90 bg-emerald-500/15',
  Medium: 'text-amber-300/90 bg-amber-500/15',
  Hard:   'text-rose-300/90 bg-rose-500/15',
};

export default function ProblemPanel({ problem }: ProblemPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { setActiveProblem } = useLabStore();
  const { deleteProblem } = useCustomProblemsStore();

  if (!problem) {
    return (
      <div className="p-4 text-sm text-white/30 font-mono">
        Select a problem from the collection.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-semibold text-sm text-white truncate">{problem.title}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${DIFFICULTY_COLORS[problem.difficulty]}`}>
            {problem.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="p-1 text-white/30 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
            title="Delete problem"
          >
            <Trash2 size={14} />
          </button>
          <motion.div animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} className="text-white/30" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden flex flex-col flex-1"
          >
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {problem.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-zinc-800/50 text-zinc-300 border border-zinc-700/50 font-mono"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
                {problem.description}
              </p>

              {/* Examples */}
              <div className="space-y-2">
                {problem.examples.map((ex, i) => {
                  const formatValue = (val: any) => typeof val === 'object' ? JSON.stringify(val) : String(val);
                  return (
                    <div key={i} className="rounded-xl bg-[#0a0a0f] border border-white/5 p-3.5 space-y-1">
                      <div className="text-xs font-mono text-zinc-500 mb-2">Example {i + 1}</div>
                      <div className="text-xs font-mono text-zinc-400 break-all">Input: <span className="text-zinc-300">{formatValue(ex.input)}</span></div>
                      <div className="text-xs font-mono text-zinc-400 font-semibold break-all">Output: <span className="text-zinc-100">{formatValue(ex.output)}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-2xl w-full max-w-sm"
            >
              <h3 className="text-lg font-bold text-white mb-2">Delete Problem</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Are you sure you want to delete <span className="text-white font-semibold">{problem.title}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await deleteProblem(problem.id);
                    setActiveProblem(null);
                    setShowDeleteConfirm(false);
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
