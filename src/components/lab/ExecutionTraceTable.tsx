'use client';

import { useLabStore } from '@/store/labStore';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

export default function ExecutionTraceTable() {
  const { timeline, currentStep, setCurrentStep } = useLabStore();
  const activeRowRef = useRef<HTMLTableRowElement>(null);

  // Auto-scroll to current step
  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep]);

  if (timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 text-sm font-mono p-8 text-center">
        Run the code to see the execution trace.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a12]">
      <div className="px-4 py-3 border-b border-white/8 bg-[#0d0d16] shrink-0 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">Execution Trace Log</h3>
        <span className="text-xs text-white/40 font-mono">{timeline.length - 1} steps</span>
      </div>

      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0d0d16] border-b border-white/8 shadow-md z-10">
            <tr>
              <th className="px-4 py-2 text-[10px] font-mono text-white/40 uppercase font-semibold w-12 text-center">Step</th>
              <th className="px-4 py-2 text-[10px] font-mono text-white/40 uppercase font-semibold w-32">Event</th>
              <th className="px-4 py-2 text-[10px] font-mono text-white/40 uppercase font-semibold">Variables</th>
              <th className="px-4 py-2 text-[10px] font-mono text-white/40 uppercase font-semibold">Annotation</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((snap, i) => {
              if (i === 0) return null; // Skip initial empty state
              const isCurrent = currentStep === i;
              
              // Formatting the variables state for this step
              const varEntries = Object.entries(snap.variables);
              
              return (
                <tr
                  key={i}
                  ref={isCurrent ? activeRowRef : null}
                  onClick={() => setCurrentStep(i)}
                  className={`border-b border-white/5 cursor-pointer transition-colors ${
                    isCurrent 
                      ? 'bg-violet-500/20' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <td className="px-4 py-2.5 text-xs font-mono text-white/50 text-center border-r border-white/5">
                    {i}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono border-r border-white/5">
                    <span className={`px-1.5 py-0.5 rounded-md ${getEventColor(snap.event.type)}`}>
                      {snap.event.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono border-r border-white/5">
                    <div className="flex flex-wrap gap-2">
                      {varEntries.length === 0 ? (
                        <span className="text-white/20">-</span>
                      ) : (
                        varEntries.map(([k, v]) => (
                          <span key={k} className="bg-white/5 px-1.5 py-0.5 rounded text-cyan-300">
                            {k}: <span className="text-white/70">{JSON.stringify(v)}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-white/70">
                    {snap.annotation || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getEventColor(type: string): string {
  if (type.includes('ARRAY')) return 'bg-violet-500/10 text-violet-400';
  if (type.includes('MAP') || type.includes('SET')) return 'bg-pink-500/10 text-pink-400';
  if (type.includes('VARIABLE')) return 'bg-cyan-500/10 text-cyan-400';
  if (type.includes('FUNCTION')) return 'bg-yellow-500/10 text-yellow-400';
  if (type.includes('COMPARISON')) return 'bg-orange-500/10 text-orange-400';
  return 'bg-white/10 text-white/50';
}
