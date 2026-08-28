'use client';

import { useLabStore } from '@/store/labStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function TestResultsPanel() {
  const { testResults, setTimeline, setInputJson, setExecutionError } = useLabStore();
  const [expanded, setExpanded] = useState(true);

  if (testResults.length === 0) return null;

  const passedCount = testResults.filter(r => r.passed).length;
  const totalCount = testResults.length;
  const allPassed = passedCount === totalCount;

  return (
    <div className="flex flex-col border-t border-white/10 bg-[#0a0a0f]">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/50">Test Results</span>
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
            allPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {allPassed ? <Check size={10} /> : <X size={10} />}
            {passedCount} / {totalCount} Passed
          </div>
        </div>
        {expanded ? <ChevronDown size={14} className="text-white/30" /> : <ChevronUp size={14} className="text-white/30" />}
      </div>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-black/20 text-white/30 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 font-medium w-8">Status</th>
                    <th className="px-4 py-2 font-medium">Input</th>
                    <th className="px-4 py-2 font-medium">Expected</th>
                    <th className="px-4 py-2 font-medium">Actual</th>
                    <th className="px-4 py-2 font-medium text-right w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {testResults.map((res, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2 text-center">
                        {res.passed 
                          ? <span className="text-emerald-500 font-bold">✓</span> 
                          : <span className="text-red-500 font-bold">✗</span>
                        }
                      </td>
                      <td className="px-4 py-2 text-white/70 truncate max-w-[150px]">
                        {JSON.stringify(res.input)}
                      </td>
                      <td className="px-4 py-2 text-white/70 truncate max-w-[120px]">
                        {JSON.stringify(res.expected)}
                      </td>
                      <td className="px-4 py-2 truncate max-w-[120px]">
                        {res.error ? (
                          <span className="text-red-400/80 italic">Error</span>
                        ) : (
                          <span className={res.passed ? 'text-emerald-400' : 'text-red-400'}>
                            {JSON.stringify(res.actual)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => {
                            // Load this exact test case into the visualizer
                            setInputJson(JSON.stringify(res.input, null, 2));
                            if (res.error) {
                              setExecutionError(res.error);
                              setTimeline([]);
                            } else {
                              setExecutionError(null);
                              setTimeline(res.timeline);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
                        >
                          <Search size={10} /> Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
