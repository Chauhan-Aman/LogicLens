'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ArrayState } from '@/engine/events';

interface ArrayRendererProps {
  name: string;
  state: ArrayState;
  pointers?: Record<string, number>; // e.g. { i: 2, j: 4, mid: 3, left: 1, right: 5 }
  maxVisible?: number;
}

const POINTER_COLORS: Record<string, string> = {
  i:    'text-gray-300',
  j:    'text-gray-400',
  mid:  'text-gray-300',
  left: 'text-gray-300',
  right:'text-gray-300',
  curr: 'text-white',
};

function getPointerColor(name: string): string {
  return POINTER_COLORS[name] ?? 'text-white';
}

const CELL_ACCENT: Record<string, string> = {
  highlight: 'ring-2 ring-white bg-white text-black font-bold shadow-md shadow-white/20',
  write:     'ring-2 ring-gray-400 bg-gray-300 text-black font-bold',
  swapA:     'ring-2 ring-gray-500 bg-gray-500 text-white shadow-md shadow-gray-500/20',
  swapB:     'ring-2 ring-gray-500 bg-gray-500 text-white shadow-md shadow-gray-500/20',
  normal:    'ring-1 ring-white/20 bg-white/5 text-white/80',
};

export default function ArrayRenderer({ name, state, pointers = {}, maxVisible = 20 }: ArrayRendererProps) {
  const values = state.values.slice(0, maxVisible);
  const highlights = new Set(state.highlights);
  const [swapA, swapB] = state.swapIndices ?? [-1, -1];

  // Build pointer map: index -> list of pointer names at that index
  const pointerMap: Record<number, string[]> = {};
  for (const [pName, pIdx] of Object.entries(pointers)) {
    if (pIdx >= 0 && pIdx < values.length) {
      if (!pointerMap[pIdx]) pointerMap[pIdx] = [];
      pointerMap[pIdx].push(pName);
    }
  }

  function cellClass(idx: number): string {
    if (idx === swapA || idx === swapB) {
      return CELL_ACCENT.swapA;
    }
    if (idx === state.writeIndex) return CELL_ACCENT.write;
    if (highlights.has(idx)) return CELL_ACCENT.highlight;
    return CELL_ACCENT.normal;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-mono text-white/40 uppercase tracking-widest">{name}</span>
        <span className="text-xs text-white/20">[ {values.length} ]</span>
      </div>

      <div className="relative flex flex-wrap gap-1.5 mt-8">
        <AnimatePresence>
          {values.map((val, idx) => (
            <motion.div
              key={idx}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15, delay: idx * 0.02 }}
              className="relative flex flex-col items-center gap-1"
            >
              {/* Pointer labels above */}
              <div className="absolute bottom-full mb-1 flex items-end justify-center gap-1 whitespace-nowrap pointer-events-none z-10">
                {(pointerMap[idx] ?? []).map(p => (
                  <motion.span
                    key={p}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col items-center leading-none text-[10px] font-bold font-mono ${getPointerColor(p)}`}
                  >
                    <span>{p}</span>
                    <span className="text-[8px] -mt-0.5">▼</span>
                  </motion.span>
                ))}
              </div>

              {/* Cell */}
              <motion.div
                layout
                animate={{
                  scale: highlights.has(idx) || idx === swapA || idx === swapB ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`w-10 h-10 flex items-center justify-center rounded-lg font-mono text-sm font-semibold transition-all duration-200 ${cellClass(idx)}`}
              >
                {String(val)}
              </motion.div>

              {/* Index label below */}
              <span className="text-[10px] font-mono text-white/25">{idx}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Arrow indicator for swaps */}
      {swapA >= 0 && swapB >= 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-pink-400 font-mono flex items-center gap-2"
        >
          <span>↔</span>
          <span>Swap [{swapA}] ↔ [{swapB}]</span>
        </motion.div>
      )}
    </div>
  );
}
