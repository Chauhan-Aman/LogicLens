'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ExecutionEvent } from '@/engine/events';

interface ComparisonCalloutProps {
  event: ExecutionEvent | null;
}

export default function ComparisonCallout({ event }: ComparisonCalloutProps) {
  const isComparison = event?.type === 'COMPARISON';

  return (
    <AnimatePresence>
      {isComparison && event && (
        <motion.div
          key={`cmp-${JSON.stringify(event.left)}-${JSON.stringify(event.right)}`}
          initial={{ opacity: 0, scale: 0.9, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 6 }}
          transition={{ duration: 0.2, type: 'spring', stiffness: 400, damping: 25 }}
          className="rounded-2xl ring-1 ring-white/15 bg-white/5 px-4 py-3 flex items-center gap-4"
        >
          {/* Left value */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">left</span>
            <span className="text-xl font-bold font-mono text-white">
              {JSON.stringify(event.left)}
            </span>
          </div>

          {/* Operator */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/30 text-lg">≟</span>
            <motion.span
              key={String(event.result)}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                event.result
                  ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                  : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
              }`}
            >
              {event.result ? '✓ match' : '✗ no'}
            </motion.span>
          </div>

          {/* Right value */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">right</span>
            <span className="text-xl font-bold font-mono text-white">
              {JSON.stringify(event.right)}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
