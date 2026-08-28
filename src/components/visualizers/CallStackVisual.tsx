'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { FunctionFrame } from '@/engine/events';

interface CallStackVisualProps {
  frames: FunctionFrame[];
}

const DEPTH_COLORS = [
  { ring: 'ring-violet-500/40', bg: 'bg-violet-500/10', text: 'text-violet-300', dot: 'bg-violet-500' },
  { ring: 'ring-cyan-500/40',   bg: 'bg-cyan-500/10',   text: 'text-cyan-300',   dot: 'bg-cyan-500' },
  { ring: 'ring-orange-500/40', bg: 'bg-orange-500/10', text: 'text-orange-300', dot: 'bg-orange-500' },
  { ring: 'ring-pink-500/40',   bg: 'bg-pink-500/10',   text: 'text-pink-300',   dot: 'bg-pink-500' },
  { ring: 'ring-emerald-500/40',bg: 'bg-emerald-500/10',text: 'text-emerald-300',dot: 'bg-emerald-500' },
];

function formatArgs(args: unknown[]): string {
  return args.map(a => {
    if (Array.isArray(a)) return `[${(a as unknown[]).slice(0, 4).join(', ')}${(a as unknown[]).length > 4 ? '…' : ''}]`;
    return JSON.stringify(a);
  }).join(', ');
}

export default function CallStackVisual({ frames }: CallStackVisualProps) {
  if (frames.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold font-mono uppercase tracking-widest text-white/30">Call Stack</p>

      {/* Stack frames — bottom frame first (reverse for visual stack order) */}
      <div className="flex flex-col gap-1">
        <AnimatePresence>
          {[...frames].reverse().map((frame, i) => {
            const depth = frame.depth ?? (frames.length - 1 - i);
            const c = DEPTH_COLORS[depth % DEPTH_COLORS.length];
            const isTop = i === 0; // top of stack = most recent call

            return (
              <motion.div
                key={`${frame.name}-${depth}-${i}`}
                layout
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16, height: 0 }}
                transition={{ duration: 0.2, type: 'spring', stiffness: 350, damping: 26 }}
                style={{ marginLeft: (frames.length - 1 - i) * 8 }}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl ring-1 ${c.ring} ${c.bg} ${isTop ? 'shadow-md' : 'opacity-70'}`}
              >
                {/* Depth indicator dot */}
                <div className={`w-2 h-2 rounded-full ${c.dot} ${isTop ? '' : 'opacity-50'}`} />

                {/* Function name */}
                <span className={`text-xs font-bold font-mono ${c.text}`}>{frame.name}</span>

                {/* Args */}
                {frame.args.length > 0 && (
                  <span className="text-[10px] font-mono text-white/30">
                    ({formatArgs(frame.args)})
                  </span>
                )}

                {/* ACTIVE badge on top frame */}
                {isTop && (
                  <span className="ml-auto text-[8px] font-bold font-mono text-white/40 uppercase tracking-widest">
                    active
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
