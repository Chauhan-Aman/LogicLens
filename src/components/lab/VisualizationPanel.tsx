'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useLabStore } from '@/store/labStore';
import SmartArrayCanvas from '@/components/visualizers/SmartArrayCanvas';
import VariableChips from '@/components/visualizers/VariableChips';
import ComparisonCallout from '@/components/visualizers/ComparisonCallout';
import CallStackVisual from '@/components/visualizers/CallStackVisual';
import HashMapRenderer from '@/components/visualizers/HashMapRenderer';

// Colour for the annotation banner based on event type
function annotationStyle(type: string): string {
  switch (type) {
    case 'COMPARISON':     return 'from-red-500/15 to-orange-500/15 ring-red-500/25 text-red-200';
    case 'ARRAY_SWAP':     return 'from-yellow-500/15 to-amber-500/15 ring-yellow-500/25 text-yellow-200';
    case 'ARRAY_WRITE':    return 'from-emerald-500/15 to-teal-500/15 ring-emerald-500/25 text-emerald-200';
    case 'ARRAY_ACCESS':   return 'from-amber-500/15 to-yellow-500/15 ring-amber-500/25 text-amber-200';
    case 'VARIABLE_UPDATE':return 'from-cyan-500/15 to-blue-500/15 ring-cyan-500/25 text-cyan-200';
    case 'MAP_INSERT':
    case 'MAP_LOOKUP':     return 'from-pink-500/15 to-rose-500/15 ring-pink-500/25 text-pink-200';
    case 'FUNCTION_ENTER':
    case 'RECURSIVE_CALL': return 'from-violet-500/15 to-purple-500/15 ring-violet-500/25 text-violet-200';
    case 'FUNCTION_EXIT':
    case 'RECURSIVE_RETURN':return 'from-violet-500/10 to-indigo-500/10 ring-violet-500/20 text-violet-300';
    case 'ANNOTATION':     return 'from-emerald-500/15 to-green-500/15 ring-emerald-500/25 text-emerald-200';
    default:               return 'from-white/8 to-white/5 ring-white/10 text-white/70';
  }
}

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
  const hasStack = snap.callStack.length > 0;

  // Track loop iterations
  const blockStack: { type: string, iters: number }[] = [];
  for (let i = 0; i <= currentStep; i++) {
    const ev = timeline[i].event;
    if (ev.type === 'BLOCK_ENTER') {
       if (ev.label === 'loop') {
          blockStack.push({ type: 'loop', iters: 0 });
       } else if (ev.label === 'iteration') {
          if (blockStack.length > 0) {
             // Increment iteration count on the nearest loop
             for (let j = blockStack.length - 1; j >= 0; j--) {
               if (blockStack[j].type === 'loop') {
                 blockStack[j].iters++;
                 break;
               }
             }
          }
          blockStack.push({ type: 'iteration', iters: 0 });
       } else {
          blockStack.push({ type: 'other', iters: 0 });
       }
    } else if (ev.type === 'BLOCK_EXIT') {
       blockStack.pop();
    }
  }

  const deepestLoop = [...blockStack].reverse().find(b => b.type === 'loop');
  const iterDisplay = deepestLoop ? deepestLoop.iters : 0;

  const displayVariables = { ...snap.variables };
  if (iterDisplay > 0) {
    displayVariables['ITERATION'] = iterDisplay;
  }

  const hasVars = Object.keys(displayVariables).length > 0;

  const pointerNames = Object.entries(snap.variables)
    .filter(([_, v]) => typeof v === 'number')
    .map(([k, _]) => k);

  const arrayNames = Object.keys(snap.arrays);

  // Build per-array pointer map from variables
  const pointers: Record<string, number> = {};
  for (const [k, v] of Object.entries(snap.variables)) {
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 10000) {
      pointers[k] = v as number;
    }
  }

  // Detect if this looks like a sorting scenario (for bar chart mode)
  const isSortLike = arrayNames.some(n =>
    snap.arrays[n].swapIndices !== undefined || (snap.event.type === 'ARRAY_SWAP')
  );

  const bannerStyle = annotationStyle(snap.event.type);

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ─── Step Header ─── */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-white/25">Step</span>
          <span className="text-xs font-mono text-white font-bold">{snap.step}</span>
          <span className="text-[10px] font-mono text-white/25">/ {timeline.length - 1}</span>
        </div>
        <span className="text-white/10">·</span>
        <span className="text-[10px] font-mono text-white/25">{snap.operationCount} ops</span>
        {snap.recursiveDepth > 0 && (
          <span className="ml-auto text-[9px] font-mono text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded-full ring-1 ring-violet-500/30">
            depth {snap.recursiveDepth}
          </span>
        )}
      </div>

      {/* ─── Annotation Banner ─── */}
      <AnimatePresence mode="wait">
        {snap.annotation && (
          <motion.div
            key={`ann-${snap.step}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className={`mx-3 mt-3 px-4 py-2.5 rounded-xl bg-gradient-to-r ring-1 text-sm font-mono ${bannerStyle}`}
          >
            {snap.annotation}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Comparison Callout (center stage) ─── */}
      {snap.event.type === 'COMPARISON' && (
        <div className="mx-3 mt-3">
          <ComparisonCallout event={snap.event} />
        </div>
      )}

      <div className="flex-1 p-4 space-y-6">

        {/* ─── Arrays ─── */}
        {hasArrays && (
          <Section title="Arrays" color="violet">
            <div className="space-y-6">
              {Object.entries(snap.arrays).map(([name, state]) => (
                <SmartArrayCanvas
                  key={name}
                  name={name}
                  state={state}
                  pointers={pointers}
                  showBarChart={isSortLike && state.values.every(v => typeof v === 'number')}
                />
              ))}
            </div>
          </Section>
        )}

        {/* ─── Variables ─── */}
        {hasVars && (
          <Section title="Variables" color="cyan">
            <VariableChips
              variables={displayVariables}
              changedVariable={snap.changedVariable}
              pointerNames={pointerNames}
            />
          </Section>
        )}

        {/* ─── Comparison (detail) ─── */}
        {snap.event.type === 'COMPARISON' && (
          <Section title="Comparison" color="orange">
            <div className="flex items-center gap-3 text-sm font-mono text-white/70">
              <span className="text-white font-bold">{JSON.stringify(snap.event.left)}</span>
              <span className="text-white/30">vs</span>
              <span className="text-white font-bold">{JSON.stringify(snap.event.right)}</span>
              <span className={`ml-auto font-bold ${snap.event.result ? 'text-emerald-400' : 'text-red-400'}`}>
                {snap.event.result ? '= match' : '≠ diff'}
              </span>
            </div>
          </Section>
        )}

        {/* ─── Call Stack ─── */}
        {hasStack && (
          <Section title="Call Stack" color="violet">
            <CallStackVisual frames={snap.callStack} />
          </Section>
        )}

        {/* ─── Maps & Sets ─── */}
        {hasMapsOrSets && (
          <Section title="Maps & Sets" color="pink">
            <HashMapRenderer maps={snap.maps} sets={snap.sets} />
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
  color: 'cyan' | 'violet' | 'pink' | 'yellow' | 'orange';
  children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    cyan:   'text-cyan-400 border-cyan-500/30',
    violet: 'text-violet-400 border-violet-500/30',
    pink:   'text-pink-400 border-pink-500/30',
    yellow: 'text-yellow-400 border-yellow-500/30',
    orange: 'text-orange-400 border-orange-500/30',
  };

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 pb-1.5 border-b ${colors[color]}`}>
        <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${colors[color]}`}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
