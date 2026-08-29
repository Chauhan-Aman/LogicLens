'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Problem } from '@/store/labStore';

interface ProblemPanelProps {
  problem: Problem | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy:   'text-emerald-300/90 bg-emerald-500/10 ring-1 ring-emerald-500/20',
  Medium: 'text-amber-300/90 bg-amber-500/10 ring-1 ring-amber-500/20',
  Hard:   'text-rose-300/90 bg-rose-500/10 ring-1 ring-rose-500/20',
};

export default function ProblemPanel({ problem }: ProblemPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

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
        className="flex items-center justify-between px-4 py-3 border-b border-white/8 cursor-pointer hover:bg-white/3 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-semibold text-sm text-white truncate">{problem.title}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${DIFFICULTY_COLORS[problem.difficulty]}`}>
            {problem.difficulty}
          </span>
        </div>
        <motion.div animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-white/30" />
        </motion.div>
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
                    className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/50 font-mono"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">
                {problem.description}
              </p>

              {/* Examples */}
              <div className="space-y-2">
                {problem.examples.map((ex, i) => {
                  const formatValue = (val: any) => typeof val === 'object' ? JSON.stringify(val) : String(val);
                  return (
                    <div key={i} className="rounded-lg bg-white/5 ring-1 ring-white/10 p-3 space-y-1">
                      <div className="text-xs font-mono text-white/30">Example {i + 1}</div>
                      <div className="text-xs font-mono text-gray-300 break-all">Input: {formatValue(ex.input)}</div>
                      <div className="text-xs font-mono text-white font-semibold break-all">Output: {formatValue(ex.output)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
