'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ArrayState } from '@/engine/events';

interface SmartGridCanvasProps {
  name: string;
  state: ArrayState;
  pointers?: Record<string, number>;
}

const POINTER_PALETTE = [
  'text-violet-400 border-violet-400',
  'text-cyan-400 border-cyan-400',
  'text-orange-400 border-orange-400',
  'text-emerald-400 border-emerald-400',
];

export default function SmartGridCanvas({
  name,
  state,
  pointers = {},
}: SmartGridCanvasProps) {
  const grid = state.values as unknown[][];
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  
  const highlights = new Set(state.highlights || []);

  function cellClass(r: number, c: number): string {
    // 2D to 1D index mapping for highlights if they were given as 1D
    const idx = r * cols + c;
    if (highlights.has(idx))
      return 'ring-2 ring-white bg-white text-black font-bold shadow-lg shadow-white/20 z-10';
    
    return 'ring-1 ring-white/15 bg-white/5 text-white/80';
  }

  // Figure out if any pointer is meant to be a 2D coordinate [r, c]
  // Or if we have pointers named 'r', 'c', 'row', 'col', 'x', 'y'
  const activePointers: { r: number; c: number; label: string; colorIdx: number }[] = [];
  
  let pIdx = 0;
  // If we have an explicit row and col
  const rowPtrs = ['r', 'row', 'y', 'i'];
  const colPtrs = ['c', 'col', 'x', 'j'];
  
  // Try to pair them up
  for (let i = 0; i < rowPtrs.length; i++) {
    const rKey = rowPtrs[i];
    const cKey = colPtrs[i];
    if (rKey in pointers && cKey in pointers) {
      activePointers.push({
        r: pointers[rKey],
        c: pointers[cKey],
        label: `[${rKey},${cKey}]`,
        colorIdx: pIdx++,
      });
    }
  }

  // If no paired pointers were found, maybe they are single 1D pointers that we map to 2D
  if (activePointers.length === 0) {
    Object.entries(pointers).forEach(([k, v]) => {
      const r = Math.floor(v / cols);
      const c = v % cols;
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        activePointers.push({
          r,
          c,
          label: k,
          colorIdx: pIdx++,
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-white/50">{name} <span className="text-[10px] font-normal text-white/30">[{rows}x{cols}]</span></span>
      </div>

      <div className="relative p-4 rounded-xl bg-black/40 border border-white/5 overflow-x-auto">
        <div 
          className="flex flex-col gap-1 inline-flex"
        >
          {grid.map((row, r) => (
            <div key={r} className="flex gap-1">
              {row.map((val, c) => {
                const cellPtrs = activePointers.filter(p => p.r === r && p.c === c);
                
                return (
                  <div key={c} className="relative w-10 h-10 shrink-0">
                    <motion.div
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`absolute inset-0 rounded-md flex items-center justify-center font-mono text-xs transition-colors duration-200 ${cellClass(r, c)}`}
                    >
                      {String(val)}
                    </motion.div>
                    
                    {/* Pointers pointing to this cell */}
                    {cellPtrs.length > 0 && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
                        {cellPtrs.map((ptr, i) => (
                          <div 
                            key={ptr.label}
                            className={`text-[8px] font-mono font-bold px-1 rounded-sm bg-black/80 border ${POINTER_PALETTE[ptr.colorIdx % POINTER_PALETTE.length]}`}
                            style={{ marginTop: i > 0 ? '2px' : 0 }}
                          >
                            {ptr.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
