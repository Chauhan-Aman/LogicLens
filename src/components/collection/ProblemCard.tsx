'use client';

import { motion } from 'framer-motion';
import { Clock, Database, ArrowRight } from 'lucide-react';
import type { Problem } from '@/store/labStore';

interface ProblemCardProps {
  problem: Problem;
  active?: boolean;
  onSelect: (p: Problem) => void;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy:   'text-emerald-300/90 bg-emerald-500/10 ring-1 ring-emerald-500/20',
  Medium: 'text-amber-300/90 bg-amber-500/10 ring-1 ring-amber-500/20',
  Hard:   'text-rose-300/90 bg-rose-500/10 ring-1 ring-rose-500/20',
};

const TAG_COLORS = [
  'bg-blue-500/10 text-blue-300/90 ring-1 ring-blue-500/20',
  'bg-indigo-500/10 text-indigo-300/90 ring-1 ring-indigo-500/20',
  'bg-fuchsia-500/10 text-fuchsia-300/90 ring-1 ring-fuchsia-500/20',
  'bg-teal-500/10 text-teal-300/90 ring-1 ring-teal-500/20',
];

export default function ProblemCard({ problem, active, onSelect }: ProblemCardProps) {
  return (
    <motion.button
      layout
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(problem)}
      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 ${
        active
          ? 'bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20'
          : 'bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${DIFFICULTY_STYLES[problem.difficulty]}`}>
              {problem.difficulty}
            </span>
            {problem.solutions.length > 1 && (
              <span className="text-[10px] text-white/30 flex items-center gap-1">
                <Database size={9} /> {problem.solutions.length} solutions
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-white/90 leading-tight">{problem.title}</p>

          <div className="flex flex-wrap gap-1 mt-2">
            {problem.tags.slice(0, 3).map((tag, i) => (
              <span
                key={tag}
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${TAG_COLORS[i % TAG_COLORS.length]}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <ArrowRight
          size={14}
          className={`shrink-0 mt-0.5 transition-all ${active ? 'text-blue-400' : 'text-white/20'}`}
        />
      </div>

      {/* Complexity badges */}
      {problem.solutions[0] && (
        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-white/5">
          <Clock size={10} className="text-white/25" />
          <span className="text-[10px] font-mono text-white/30">
            {problem.solutions[0].complexity.time}
          </span>
        </div>
      )}
    </motion.button>
  );
}
