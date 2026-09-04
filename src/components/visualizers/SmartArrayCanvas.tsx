'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useEffect } from 'react';
import type { ArrayState } from '@/engine/events';

interface SmartArrayCanvasProps {
  name: string;
  state: ArrayState;
  pointers?: Record<string, number>;
  windowRange?: [number, number];
  showBarChart?: boolean;
}

const RANGE_PALETTE: Record<string, { border: string; bg: string; text: string; bracket: string }> = {
  violet: { border: 'border-violet-500/60', bg: 'bg-violet-500/10', text: 'text-violet-300', bracket: 'bg-violet-500' },
  cyan:   { border: 'border-cyan-500/60',   bg: 'bg-cyan-500/10',   text: 'text-cyan-300',   bracket: 'bg-cyan-500' },
  green:  { border: 'border-green-500/60',  bg: 'bg-green-500/10',  text: 'text-green-300',  bracket: 'bg-green-500' },
  orange: { border: 'border-orange-500/60', bg: 'bg-orange-500/10', text: 'text-orange-300', bracket: 'bg-orange-500' },
  pink:   { border: 'border-pink-500/60',   bg: 'bg-pink-500/10',   text: 'text-pink-300',   bracket: 'bg-pink-500' },
  yellow: { border: 'border-yellow-500/60', bg: 'bg-yellow-500/10', text: 'text-yellow-300', bracket: 'bg-yellow-500' },
};

const POINTER_PALETTE = [
  'text-violet-400 border-violet-400',
  'text-cyan-400 border-cyan-400',
  'text-orange-400 border-orange-400',
  'text-pink-400 border-pink-400',
  'text-green-400 border-green-400',
];

export default function SmartArrayCanvas({
  name,
  state,
  pointers = {},
  windowRange,
  showBarChart = false,
}: SmartArrayCanvasProps) {
  const values = state.values;
  const highlights = new Set(state.highlights);
  const [swapA, swapB] = state.swapIndices ?? [-1, -1];
  const ranges = state.activeRanges ?? [];

  // Map: index → pointer names
  const pointerMap: Record<number, string[]> = {};
  for (const [pName, pIdx] of Object.entries(pointers)) {
    if (typeof pIdx === 'number' && pIdx >= 0 && pIdx < values.length) {
      if (!pointerMap[pIdx]) pointerMap[pIdx] = [];
      pointerMap[pIdx].push(pName);
    }
  }

  // List of pointer names in order (for consistent color assignment)
  const pointerNames = Object.keys(pointers);

  // For each cell, find which range (if any) it belongs to (deepest wins)
  function getRangeForIdx(idx: number) {
    const matching = ranges.filter(r => idx >= r.start && idx <= r.end);
    if (matching.length === 0) return null;
    return matching.sort((a, b) => b.depth - a.depth)[0];
  }

  function cellClass(idx: number): string {
    if (idx === swapA || idx === swapB)
      return 'ring-2 ring-yellow-400 bg-yellow-400/20 text-yellow-100 font-bold scale-110 z-10';
    if (idx === state.writeIndex)
      return 'ring-2 ring-emerald-400 bg-emerald-400/20 text-emerald-100 font-bold z-10';
    if (highlights.has(idx))
      return 'ring-2 ring-white bg-white text-black font-bold shadow-lg shadow-white/20 z-10';
    const range = getRangeForIdx(idx);
    if (range) {
      const palette = RANGE_PALETTE[range.color ?? 'violet'];
      return `border ${palette.border} ${palette.bg}`;
    }
    
    if (windowRange && idx >= windowRange[0] && idx <= windowRange[1]) {
      // Glow effect for sliding window elements
      return 'ring-1 ring-cyan-500/50 bg-cyan-500/15 text-cyan-50 font-bold';
    }
    
    return 'ring-1 ring-white/15 bg-white/5 text-white/80';
  }

  // Bar chart max for height scaling
  const numericValues = values.filter(v => typeof v === 'number') as number[];
  const maxVal = numericValues.length > 0 ? Math.max(...numericValues, 1) : 1;

  return (
    <div className="space-y-2">
      {/* Array name + length */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono">{name}</span>
        <span className="text-[10px] text-white/20 font-mono">[ {values.length} ]</span>
        {ranges.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {[...new Map(ranges.map(r => [r.label ?? `d${r.depth}`, r])).values()].map(r => {
              const palette = RANGE_PALETTE[r.color ?? 'violet'];
              return (
                <span key={`${r.start}-${r.end}`} className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${palette.border} ${palette.text}`}>
                  {r.label ?? `depth ${r.depth}`} [{r.start}..{r.end}]
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Bar chart mode */}
      {showBarChart && numericValues.length === values.length ? (
        <div className="flex items-end gap-1 h-24">
          {values.map((val, idx) => {
            const h = Math.max(4, ((val as number) / maxVal) * 88);
            return (
              <motion.div
                key={idx}
                layout
                style={{ height: h }}
                animate={{ height: h }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`flex-1 min-w-[12px] rounded-t-sm flex items-end justify-center ${
                  idx === swapA || idx === swapB
                    ? 'bg-yellow-400'
                    : highlights.has(idx)
                    ? 'bg-white'
                    : idx === state.writeIndex
                    ? 'bg-emerald-400'
                    : 'bg-violet-500/60'
                }`}
              />
            );
          })}
        </div>
      ) : (
        /* Cell block mode */
        <div className="relative flex flex-wrap gap-1.5 mt-8 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence>
            {values.map((val, idx) => {
              const cellPtrs = pointerMap[idx] ?? [];
              return (
                <motion.div
                  key={state.ids ? state.ids[idx] : idx}
                  layout
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.12, delay: idx * 0.015 }}
                  className="relative flex flex-col items-center gap-0.5"
                >
                  {/* Pointer labels above cell */}
                  <div className="absolute bottom-full mb-1 flex flex-col items-center justify-end pointer-events-none z-10">
                    <div className="flex items-end justify-center gap-1 whitespace-nowrap">
                      {cellPtrs.map(p => {
                        const colorClass = POINTER_PALETTE[pointerNames.indexOf(p) % POINTER_PALETTE.length];
                        return (
                          <motion.div
                            key={p}
                            layout
                            layoutId={`ptr-${name}-${p}`}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex flex-col items-center leading-none`}
                          >
                            <span className={`text-[10px] font-bold font-mono ${colorClass.split(' ')[0]}`}>{p}</span>
                            <span className={`text-[8px] -mt-0.5 ${colorClass.split(' ')[0]}`}>▼</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cell */}
                  <motion.div
                    layout
                    animate={{
                      scale: highlights.has(idx) || idx === swapA || idx === swapB ? 1.12 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    className={`w-11 h-11 flex items-center justify-center rounded-lg font-mono text-sm transition-colors duration-150 ${cellClass(idx)}`}
                  >
                    {String(val)}
                  </motion.div>

                  {/* Index below */}
                  <span className="text-[9px] font-mono text-white/20">{idx}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Swap callout */}
      {swapA >= 0 && swapB >= 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-xs text-yellow-400 font-mono"
        >
          <span>⇄</span>
          <span>Swapping [{swapA}] ↔ [{swapB}]</span>
        </motion.div>
      )}
    </div>
  );
}
