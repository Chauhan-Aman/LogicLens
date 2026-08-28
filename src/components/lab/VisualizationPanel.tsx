'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useLabStore } from '@/store/labStore';
import ArrayRenderer from '@/components/visualizers/ArrayRenderer';
import HashMapRenderer from '@/components/visualizers/HashMapRenderer';
import VariablePanel from '@/components/visualizers/VariablePanel';

export default function VisualizationPanel() {
  const { timeline, currentStep, executionError } = useLabStore();

  const snap = timeline[currentStep] ?? null;

  if (executionError) {
    return (
      <div className="flex flex-col gap-3 p-4 h-full">
        <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 p-4">
          <p className="text-sm font-semibold text-red-400 mb-1">Execution Error</p>
          <pre className="text-xs font-mono text-red-300/70 whitespace-pre-wrap">{executionError}</pre>
        </div>
      </div>
    );
  }

  if (!snap) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-3xl">
          ⚡
        </div>
        <div>
          <p className="text-white/50 text-sm font-medium">Ready to execute</p>
          <p className="text-white/25 text-xs mt-1">Write your code and press Run</p>
        </div>
      </div>
    );
  }

  const hasArrays = Object.keys(snap.arrays).length > 0;
  const hasMapsOrSets = Object.keys(snap.maps).length > 0 || Object.keys(snap.sets).length > 0;
  const hasVars = Object.keys(snap.variables).length > 0;

  // Extract pointer-like variables for the array renderer
  const pointers: Record<string, number> = {};
  for (const [k, v] of Object.entries(snap.variables)) {
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1000) {
      pointers[k] = v;
    }
  }

  return (
    <div className="flex flex-col gap-0 h-full overflow-y-auto">
      {/* Annotation banner */}
      <AnimatePresence mode="wait">
        {snap.annotation && (
          <motion.div
            key={`ann-${snap.step}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="mx-4 mt-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500/15 to-cyan-500/15 ring-1 ring-violet-500/25 text-sm text-white/80 font-mono"
          >
            {snap.annotation}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step counter */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <span className="text-xs font-mono text-white/25">Step</span>
        <span className="text-xs font-mono text-white/60 font-semibold">{snap.step}</span>
        <span className="text-xs font-mono text-white/25">/ {timeline.length - 1}</span>
        <span className="ml-auto text-xs font-mono text-white/25">
          {snap.operationCount} ops
        </span>
      </div>

      <div className="flex-1 p-4 space-y-5">
        {/* Variables */}
        {hasVars && (
          <Section title="Variables" color="cyan">
            <VariablePanel variables={snap.variables} />
          </Section>
        )}

        {/* Arrays */}
        {hasArrays && (
          <Section title="Arrays" color="violet">
            {Object.entries(snap.arrays).map(([name, state]) => (
              <ArrayRenderer key={name} name={name} state={state} pointers={pointers} />
            ))}
          </Section>
        )}

        {/* Maps & Sets */}
        {hasMapsOrSets && (
          <Section title="Maps & Sets" color="pink">
            <HashMapRenderer maps={snap.maps} sets={snap.sets} />
          </Section>
        )}

        {/* Call stack */}
        {snap.callStack.length > 0 && (
          <Section title="Call Stack" color="yellow">
            <div className="space-y-1">
              {[...snap.callStack].reverse().map((frame, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-lg bg-white/5 ring-1 ring-white/10 text-xs font-mono text-white/60"
                >
                  {frame.name}({frame.args.map(a => JSON.stringify(a)).join(', ')})
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: 'cyan' | 'violet' | 'pink' | 'yellow';
  children: React.ReactNode;
}) {
  const colors = {
    cyan:   'text-cyan-400 border-cyan-500/30',
    violet: 'text-violet-400 border-violet-500/30',
    pink:   'text-pink-400 border-pink-500/30',
    yellow: 'text-yellow-400 border-yellow-500/30',
  };

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 pb-1.5 border-b ${colors[color]}`}>
        <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${colors[color]}`}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
