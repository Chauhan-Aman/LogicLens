'use client';

import type { StateSnapshot } from '@/engine/events';
import { motion } from 'framer-motion';
import { RefreshCcw, GitBranch, Variable, ArrowRightLeft, FunctionSquare, Globe, CheckCircle2, Code2, Database } from 'lucide-react';

interface FlowNodeProps {
  snap: StateSnapshot;
  isActive: boolean;
  onClick: () => void;
}

export default function FlowNode({ snap, isActive, onClick }: FlowNodeProps) {
  const type = snap.event.type;
  
  let title = 'Execution Step';
  let subtitle = '';
  let Icon = Code2;
  let borderColor = 'border-white/10';
  let iconColor = 'text-white/40';

  if (type === 'BLOCK_ENTER') {
    if (snap.event.blockType === 'loop') {
      title = `Loop (${snap.event.blockLabel})`;
      subtitle = 'Start Loop block';
      Icon = RefreshCcw;
      borderColor = 'border-blue-500/30';
      iconColor = 'text-blue-400';
    } else {
      title = `Iteration`;
      subtitle = 'Next loop cycle';
      Icon = RefreshCcw;
      borderColor = 'border-indigo-500/30';
      iconColor = 'text-indigo-400';
    }
  } else if (type === 'COMPARISON') {
    title = 'Condition Match';
    subtitle = `${JSON.stringify(snap.event.left)} ${snap.event.result ? '==' : '!='} ${JSON.stringify(snap.event.right)}`;
    Icon = GitBranch;
    borderColor = snap.event.result ? 'border-emerald-500/40' : 'border-red-500/30';
    iconColor = snap.event.result ? 'text-emerald-400' : 'text-red-400';
  } else if (type === 'VARIABLE_UPDATE') {
    title = 'Variable Assignment';
    subtitle = `${snap.event.variable} = ${JSON.stringify(snap.event.value)}`;
    Icon = Variable;
    borderColor = 'border-amber-500/30';
    iconColor = 'text-amber-400';
  } else if (type === 'ARRAY_SWAP') {
    title = 'Array Swap';
    subtitle = `Swap indices [${snap.event.index}] and [${snap.event.indexB}]`;
    Icon = ArrowRightLeft;
    borderColor = 'border-orange-500/30';
    iconColor = 'text-orange-400';
  } else if (type === 'FUNCTION_ENTER') {
    title = `Callable`;
    subtitle = `${snap.event.fn}() executed`;
    Icon = FunctionSquare;
    borderColor = 'border-purple-500/30';
    iconColor = 'text-purple-400';
  } else if (type === 'MAP_INSERT' || type === 'MAP_DELETE') {
    title = 'Storage';
    subtitle = `Key: ${snap.event.key}`;
    Icon = Database;
    borderColor = 'border-teal-500/30';
    iconColor = 'text-teal-400';
  } else {
    title = type.replace('_', ' ');
    Icon = Globe;
  }

  // Active state styling
  const activeStyles = isActive 
    ? 'ring-2 ring-white/50 shadow-[0_0_20px_rgba(255,255,255,0.1)] bg-white/[0.05]' 
    : 'bg-[#111115] hover:bg-white/[0.03]';

  return (
    <motion.div
      onClick={onClick}
      className={`relative w-[320px] rounded-lg border ${borderColor} ${activeStyles} p-4 flex items-center justify-between cursor-pointer transition-all duration-200`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Step badge top-left corner */}
      <div className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-md bg-[#1a1a20] border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-white/50 z-10 shadow-lg">
        {snap.step}
      </div>

      <div className="flex items-center gap-4">
        {/* Left Icon Area */}
        <div className={`w-10 h-10 rounded-md bg-white/[0.03] flex items-center justify-center border border-white/5 ${iconColor}`}>
          <Icon size={18} strokeWidth={2} />
        </div>

        {/* Text Content */}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white/90">{title}</span>
          <span className="text-xs font-mono text-white/50 mt-0.5 max-w-[180px] truncate">{subtitle}</span>
        </div>
      </div>

      {/* Right Status */}
      <div className="flex flex-col items-center justify-center h-full text-emerald-500/80">
        {(type === 'COMPARISON' && snap.event.result) || type === 'BLOCK_ENTER' || type === 'FUNCTION_ENTER' ? (
           <CheckCircle2 size={16} />
        ) : (
           <div className="w-4 h-4 rounded-full border border-white/10" />
        )}
      </div>
    </motion.div>
  );
}
