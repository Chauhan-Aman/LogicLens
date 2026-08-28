'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { MapState, SetState } from '@/engine/events';

interface HashMapRendererProps {
  maps: Record<string, MapState>;
  sets: Record<string, SetState>;
}

function EntryRow({
  k,
  v,
  highlighted,
}: {
  k: unknown;
  v: unknown;
  highlighted: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center justify-between px-3 py-2 rounded-lg font-mono text-sm transition-all duration-200 ${
        highlighted
          ? 'bg-violet-500/25 ring-1 ring-violet-400 text-violet-200'
          : 'bg-white/5 ring-1 ring-white/10 text-white/70'
      }`}
    >
      <span className="text-cyan-300">{JSON.stringify(k)}</span>
      <span className="text-white/30 mx-2">→</span>
      <span className="text-emerald-300">{JSON.stringify(v)}</span>
    </motion.div>
  );
}

function SetRow({ value, highlighted }: { value: unknown; highlighted: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.2 }}
      className={`px-3 py-2 rounded-lg font-mono text-sm font-medium transition-all duration-200 ${
        highlighted
          ? 'bg-pink-500/25 ring-1 ring-pink-400 text-pink-200'
          : 'bg-white/5 ring-1 ring-white/10 text-white/70'
      }`}
    >
      {JSON.stringify(value)}
    </motion.div>
  );
}

export default function HashMapRenderer({ maps, sets }: HashMapRendererProps) {
  const hasMaps = Object.keys(maps).length > 0;
  const hasSets = Object.keys(sets).length > 0;

  if (!hasMaps && !hasSets) {
    return (
      <div className="flex items-center justify-center h-24 text-white/20 text-sm font-mono">
        No maps or sets yet
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Maps */}
      {Object.entries(maps).map(([name, state]) => (
        <div key={name} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white/40 uppercase tracking-widest">{name}</span>
            <span className="text-xs text-white/20 font-mono">HashMap · {state.entries.length} entries</span>
          </div>

          {state.entries.length === 0 ? (
            <div className="text-xs text-white/25 font-mono px-3 py-2 bg-white/3 rounded-lg">
              {'{ }'}
            </div>
          ) : (
            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {state.entries.map(([k, v], i) => (
                  <EntryRow
                    key={`${JSON.stringify(k)}-${i}`}
                    k={k}
                    v={v}
                    highlighted={JSON.stringify(k) === JSON.stringify(state.highlightKey)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      ))}

      {/* Sets */}
      {Object.entries(sets).map(([name, state]) => (
        <div key={name} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white/40 uppercase tracking-widest">{name}</span>
            <span className="text-xs text-white/20 font-mono">HashSet · {state.values.length} values</span>
          </div>

          {state.values.length === 0 ? (
            <div className="text-xs text-white/25 font-mono px-3 py-2 bg-white/3 rounded-lg">
              {'{ }'}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence mode="popLayout">
                {state.values.map((v, i) => (
                  <SetRow
                    key={`${JSON.stringify(v)}-${i}`}
                    value={v}
                    highlighted={JSON.stringify(v) === JSON.stringify(state.highlightValue)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
