'use client';

import type { StateSnapshot } from '@/engine/events';
import { motion } from 'framer-motion';

interface FlowNodeProps {
  snap: StateSnapshot;
  isActive: boolean;
  onClick: () => void;
}

export default function FlowNode({ snap, isActive, onClick }: FlowNodeProps) {
  // Compress array view to tiny blocks
  const firstArrayName = Object.keys(snap.arrays)[0];
  const firstArray = firstArrayName ? snap.arrays[firstArrayName] : null;
  const isCall = snap.event.type === 'FUNCTION_ENTER' || snap.event.type === 'RECURSIVE_CALL';
  const isRet = snap.event.type === 'FUNCTION_EXIT' || snap.event.type === 'RECURSIVE_RETURN';

  let borderColor = 'border-white/10';
  let bgColor = 'bg-black/60';
  if (snap.event.type === 'COMPARISON') borderColor = 'border-orange-500/50';
  if (snap.event.type === 'ARRAY_SWAP') borderColor = 'border-yellow-500/50';
  if (isCall || isRet) borderColor = 'border-violet-500/50';
  if (snap.event.type === 'VARIABLE_UPDATE') borderColor = 'border-cyan-500/50';
  
  if (isActive) {
    bgColor = 'bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)] ring-1 ring-white/50';
  }

  // Find scalar variables to show briefly
  const scalarVars = Object.entries(snap.variables)
    .filter(([, v]) => typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string')
    .slice(0, 3); // max 3 to keep it compressed

  return (
    <motion.div
      onClick={onClick}
      className={`w-40 rounded-lg border ${borderColor} ${bgColor} overflow-hidden flex flex-col cursor-pointer hover:border-white/40 transition-colors backdrop-blur-md`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-white/[0.03] border-b border-white/5">
        <span className="text-[9px] font-mono font-bold text-white/50">#{snap.step}</span>
        <span className="text-[8px] font-mono uppercase text-white/40 truncate max-w-[80px]">
          {snap.event.type.replace('ARRAY_', '').replace('VARIABLE_', '')}
        </span>
      </div>

      <div className="p-2 flex flex-col gap-1.5">
        {/* Compressed Array View */}
        {firstArray && (
          <div className="flex flex-wrap gap-0.5 justify-center">
            {firstArray.values.map((v, i) => (
              <div 
                key={i} 
                className={`w-3 h-3 flex items-center justify-center text-[7px] font-mono rounded-sm
                  ${firstArray.highlights.includes(i) || firstArray.swapIndices?.includes(i)
                    ? 'bg-white text-black font-bold' 
                    : 'bg-white/10 text-white/70'}`}
              >
                {String(v).substring(0, 2)}
              </div>
            ))}
          </div>
        )}

        {/* Compressed Variables View */}
        {scalarVars.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5 justify-center">
            {scalarVars.map(([k, v]) => (
              <div key={k} className="text-[8px] font-mono flex items-center gap-0.5">
                <span className="text-white/30">{k}:</span>
                <span className="text-white/80">{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Event detail */}
        {snap.event.type === 'COMPARISON' && (
          <div className={`text-[8px] font-mono text-center font-bold px-1 py-0.5 rounded ${snap.event.result ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
            {JSON.stringify(snap.event.left)} {snap.event.result ? '==' : '!='} {JSON.stringify(snap.event.right)}
          </div>
        )}
        
        {isCall && snap.event.fn && (
          <div className="text-[8px] font-mono text-center text-violet-300 bg-violet-500/10 px-1 py-0.5 rounded truncate">
            {snap.event.fn}()
          </div>
        )}
      </div>
    </motion.div>
  );
}
