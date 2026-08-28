'use client';

import { useLabStore } from '@/store/labStore';
import { motion } from 'framer-motion';

export default function ConceptualVisualizer() {
  const { activeProblem } = useLabStore();

  if (!activeProblem) {
    return null;
  }

  // Very simple static conceptual representations for the 5 built-in problems
  const renderConcept = () => {
    switch (activeProblem.id) {
      case 'two-sum':
        return (
          <div className="space-y-6 text-left">
            <h3 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2">Problem Concept</h3>
            <p className="text-sm text-white/60">Find two numbers that add up to the target.</p>
            <div className="flex justify-center py-4">
              <div className="flex gap-2">
                {[2, 7, 11, 15].map(n => (
                  <div key={n} className="w-10 h-10 bg-white/5 ring-1 ring-white/10 rounded flex items-center justify-center font-mono text-sm">{n}</div>
                ))}
              </div>
            </div>
            <p className="text-xs text-white/40 text-center">Target = 9</p>
            
            <h3 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2 mt-8">Optimal Solution Concept</h3>
            <p className="text-sm text-white/60">Instead of checking every pair (O(n²)), we can iterate once.</p>
            <p className="text-sm text-white/60">For each number, we check if we've seen its <strong>complement</strong> (target - number) using a HashMap.</p>
            <div className="bg-white/5 p-4 rounded-lg mt-4 font-mono text-xs text-white/50">
              <div>Iteration 1: num = 2, complement = 7. Seen 7? No. Store {`{2: 0}`}</div>
              <div>Iteration 2: num = 7, complement = 2. Seen 2? Yes! Return [0, 1]</div>
            </div>
          </div>
        );
        
      case 'best-time-to-buy-sell-stock':
        return (
          <div className="space-y-6 text-left">
            <h3 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2">Problem Concept</h3>
            <p className="text-sm text-white/60">Find the maximum difference between two numbers, where the smaller number comes before the larger number.</p>
            
            <h3 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2 mt-8">Optimal Solution Concept</h3>
            <p className="text-sm text-white/60">Iterate through the array while keeping track of the minimum price seen so far.</p>
            <p className="text-sm text-white/60">If we find a new minimum, update it. Otherwise, calculate the profit if we sold today, and update the max profit if it's higher.</p>
            <div className="bg-white/5 p-4 rounded-lg mt-4 font-mono text-xs text-white/50">
              <div>Track: minPrice, maxProfit</div>
              <div>[7, 1, 5, 3, 6, 4]</div>
              <div>     ^min     ^max profit (6-1=5)</div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="space-y-4">
             <p className="text-sm text-white/50">
              Conceptual visualization and problem understanding tools are designed to explain the algorithmic approach *before* you write the code.
            </p>
            <p className="text-sm text-white/40">
              Select one of the classic problems like Two Sum to see a detailed conceptual breakdown.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#0a0a12]">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto mt-4"
      >
        <h2 className="text-lg font-bold text-white/90 mb-6 flex items-center gap-2">
          <span className="text-violet-400">💡</span> {activeProblem.title}
        </h2>
        {renderConcept()}
      </motion.div>
    </div>
  );
}
