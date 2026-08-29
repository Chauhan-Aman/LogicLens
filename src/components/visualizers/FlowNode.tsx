'use client';

import type { StateSnapshot } from '@/engine/events';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, GitBranch, Variable, ArrowRightLeft, FunctionSquare, Globe, CheckCircle2, Code2, Database } from 'lucide-react';

interface AggregatedNodeData {
  id: string;
  type: string;
  label?: string;
  snapshots: StateSnapshot[];
}

interface FlowNodeProps {
  nodeData: AggregatedNodeData;
  isActive: boolean;
  currentStep: number;
  onClick: (step: number) => void;
}

export default function FlowNode({ nodeData, isActive, currentStep, onClick }: FlowNodeProps) {
  const { type, snapshots } = nodeData;
  
  // Base snapshot determines step numbering
  const baseSnap = snapshots[0];
  if (!baseSnap) return null;

  let title = 'Execution Step';
  let subtitle = '';
  let Icon = Code2;
  let borderColor = 'border-white/10';
  let iconColor = 'text-white/40';

  // Extract variables and comparisons that happened in this block up to the currentStep
  // If the node is active, we only show what has happened SO FAR.
  // If the node is completely passed, we show everything that happened in it.
  const visibleSnaps = isActive 
    ? snapshots.filter(s => s.step <= currentStep)
    : snapshots;

  const varsSet = new Map<string, unknown>();
  let lastComparison: StateSnapshot | null = null;
  let isReturned = false;

  for (const s of visibleSnaps) {
    if (s.event.type === 'VARIABLE_UPDATE' && s.event.variable) {
      varsSet.set(s.event.variable, s.event.value);
    }
    if (s.event.type === 'COMPARISON') {
      lastComparison = s;
    }
    if (s.event.type === 'FUNCTION_EXIT') {
      isReturned = true;
    }
  }

  if (type === 'iteration') {
    title = 'Loop Iteration';
    subtitle = 'Iterating elements';
    Icon = RefreshCcw;
    borderColor = 'border-indigo-500/30';
    iconColor = 'text-indigo-400';
    
    if (varsSet.size > 0) {
      // Build a title from the variables, e.g., i = 0, j = 1
      title = Array.from(varsSet.entries()).map(([k, v]) => `${k} = ${v}`).join(', ');
      subtitle = 'Variables Updated';
    }
  } else if (type === 'function') {
    title = `Call ${nodeData.label}()`;
    subtitle = 'Function Entry';
    Icon = FunctionSquare;
    borderColor = 'border-purple-500/30';
    iconColor = 'text-purple-400';
  } else if (type === 'step') {
    // Single step
    const ev = baseSnap.event;
    if (ev.type === 'COMPARISON') {
      title = `${JSON.stringify(ev.left)} ${ev.result ? '==' : '!='} ${JSON.stringify(ev.right)}`;
      subtitle = 'Condition Match';
      Icon = GitBranch;
      borderColor = ev.result ? 'border-emerald-500/40' : 'border-red-500/30';
      iconColor = ev.result ? 'text-emerald-400' : 'text-red-400';
      lastComparison = baseSnap;
    } else if (ev.type === 'VARIABLE_UPDATE') {
      if (varsSet.size > 0) {
        title = Array.from(varsSet.entries()).map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join(', ');
      } else {
        title = `${ev.variable} = ${JSON.stringify(ev.value)}`;
      }
      subtitle = 'Variable Assignment';
      Icon = Variable;
      borderColor = 'border-amber-500/30';
      iconColor = 'text-amber-400';
    } else if (ev.type === 'ARRAY_SWAP') {
      title = `Swap [${ev.index}] ↔ [${ev.indexB}]`;
      subtitle = 'Array Swap';
      Icon = ArrowRightLeft;
      borderColor = 'border-orange-500/30';
      iconColor = 'text-orange-400';
    } else if (ev.type === 'ANNOTATION') {
      const payload = (ev as any).payload;
      title = (ev as any).message || (payload && payload.message) || 'Annotation';
      subtitle = 'Note';
      Icon = Globe;
    } else {
      title = ev.type.replace('_', ' ');
      Icon = Globe;
    }
  }

  // Active state styling
  const activeStyles = isActive 
    ? 'ring-2 ring-white/50 shadow-[0_0_20px_rgba(255,255,255,0.1)] bg-white/[0.05]' 
    : 'bg-[#111115] hover:bg-white/[0.03]';

  // Does this node represent a successful condition?
  const isSuccess = (lastComparison && lastComparison.event.result === true) || isReturned;

  return (
    <motion.div
      onClick={() => onClick(baseSnap.step)}
      className={`relative w-[340px] rounded-lg border ${borderColor} ${activeStyles} p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Step badge top-left corner */}
      <div className="absolute -top-2.5 -left-2.5 px-1.5 h-5 rounded-md bg-[#1a1a20] border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-white/50 z-10 shadow-lg">
        {type === 'iteration' && snapshots.length > 1 
          ? `${baseSnap.step} - ${snapshots[snapshots.length-1].step}`
          : baseSnap.step}
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Left Icon Area */}
          <div className={`shrink-0 w-8 h-8 rounded-md bg-white/[0.03] flex items-center justify-center border border-white/5 ${iconColor}`}>
            <Icon size={16} strokeWidth={2} />
          </div>

          {/* Text Content (Flipped Hierarchy) */}
          <div className="flex flex-col">
            <span className="text-sm font-mono font-bold text-white/90 leading-tight">
              {title}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mt-1">
              {subtitle}
            </span>
          </div>
        </div>

        {/* Right Status */}
        <div className="shrink-0 flex items-center justify-center h-8">
          {isSuccess ? (
             <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
             <div className="w-4 h-4 rounded-full border border-white/10" />
          )}
        </div>
      </div>

      {/* Embedded Details (Comparisons inside the iteration) */}
      <AnimatePresence>
        {lastComparison && type === 'iteration' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-1 pt-3 border-t border-white/5 flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-white/40">condition:</span>
              <span className="text-white/80">
                {JSON.stringify(lastComparison.event.left)} {lastComparison.event.result ? '==' : '!='} {JSON.stringify(lastComparison.event.right)}
              </span>
              <span className={`px-1.5 rounded ${lastComparison.event.result ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {lastComparison.event.result ? 'matched' : 'failed'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
