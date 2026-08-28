'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface VariableChipsProps {
  variables: Record<string, unknown>;
  changedVariable?: string;
  pointerNames?: string[];  // variables that are "pointers" (shown on array), greyed out here
}

const CHIP_COLORS = [
  { ring: 'ring-cyan-500/40', bg: 'bg-cyan-500/10', text: 'text-cyan-300', label: 'text-cyan-500/60' },
  { ring: 'ring-violet-500/40', bg: 'bg-violet-500/10', text: 'text-violet-300', label: 'text-violet-500/60' },
  { ring: 'ring-orange-500/40', bg: 'bg-orange-500/10', text: 'text-orange-300', label: 'text-orange-500/60' },
  { ring: 'ring-pink-500/40', bg: 'bg-pink-500/10', text: 'text-pink-300', label: 'text-pink-500/60' },
  { ring: 'ring-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-300', label: 'text-emerald-500/60' },
  { ring: 'ring-yellow-500/40', bg: 'bg-yellow-500/10', text: 'text-yellow-300', label: 'text-yellow-500/60' },
  { ring: 'ring-white/20', bg: 'bg-white/5', text: 'text-white/70', label: 'text-white/30' },
];

function formatValue(v: unknown): string {
  if (Array.isArray(v)) return `[${(v as unknown[]).slice(0, 5).join(', ')}${(v as unknown[]).length > 5 ? '…' : ''}]`;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  return String(v);
}

export default function VariableChips({ variables, changedVariable, pointerNames = [] }: VariableChipsProps) {
  const entries = Object.entries(variables);
  if (entries.length === 0) return null;

  // Arrays are shown in SmartArrayCanvas — only show scalars here
  const scalarEntries = entries.filter(([, v]) => !Array.isArray(v));

  return (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence>
        {scalarEntries.map(([k, v], colorIdx) => {
          const isChanged = k === changedVariable;
          const isPointer = pointerNames.includes(k);
          const c = CHIP_COLORS[colorIdx % (CHIP_COLORS.length - 1)];
          const greyC = CHIP_COLORS[CHIP_COLORS.length - 1];
          const palette = isPointer ? greyC : c;

          return (
            <motion.div
              key={k}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              className={`relative flex flex-col items-center px-3 py-2 rounded-xl ring-1 ${palette.ring} ${palette.bg} min-w-[60px]`}
            >
              {/* Flash overlay when this variable changed */}
              {isChanged && (
                <motion.div
                  key={`flash-${k}-${String(v)}`}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 rounded-xl bg-white/20 pointer-events-none"
                />
              )}

              {/* Variable name */}
              <span className={`text-[9px] font-bold font-mono uppercase tracking-wider ${palette.label}`}>
                {k}
              </span>

              {/* Value — animate on change */}
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={`${k}-${String(v)}`}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  transition={{ duration: 0.18, type: 'spring', stiffness: 400, damping: 25 }}
                  className={`text-sm font-bold font-mono ${palette.text}`}
                >
                  {formatValue(v)}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
