'use client';

import { motion } from 'framer-motion';
import { Clock, Database, ArrowRight } from 'lucide-react';
import type { Problem } from '@/store/labStore';

interface ProblemCardProps {
  problem: Problem;
  active?: boolean;
  onSelect: (p: Problem) => void;
  onDelete?: (p: Problem) => void;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy:   'text-emerald-300/90 bg-emerald-500/15',
  Medium: 'text-amber-300/90 bg-amber-500/15',
  Hard:   'text-rose-300/90 bg-rose-500/15',
};

const TAG_COLORS = [
  'bg-blue-500/15 text-blue-300/90',
  'bg-indigo-500/15 text-indigo-300/90',
  'bg-fuchsia-500/15 text-fuchsia-300/90',
  'bg-teal-500/15 text-teal-300/90',
];

export default function ProblemCard({ problem, active, onSelect, onDelete }: ProblemCardProps) {
  return (
    <motion.button
      layout
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(problem)}
      className={`w-full text-left p-3 rounded-lg transition-all duration-200 relative group ${
        active
          ? 'bg-white/10'
          : 'hover:bg-white/5'
      }`}
    >
      {onDelete && (
        <div 
          className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 rounded-md text-white/30 hover:text-red-400 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(problem);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 pr-6">
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
          className={`shrink-0 mt-0.5 transition-all ${active ? 'text-blue-400' : 'text-white/20'} ${onDelete ? 'group-hover:opacity-0' : ''}`}
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
