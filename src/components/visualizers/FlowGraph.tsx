'use client';

import { useLabStore } from '@/store/labStore';
import { useRef, useEffect, useState, useMemo } from 'react';
import FlowNode from './FlowNode';
import { Plus } from 'lucide-react';
import type { StateSnapshot } from '@/engine/events';

export default function FlowGraph() {
  const { timeline, currentStep, setCurrentStep } = useLabStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Aggregate timeline into logical groups (iterations/blocks)
  const aggregatedNodes = useMemo(() => {
    if (timeline.length === 0) return [];

    const result: { id: string; type: string; label?: string; snapshots: StateSnapshot[] }[] = [];
    let currentGroup: { id: string; type: string; label?: string; snapshots: StateSnapshot[] } | null = null;
    let groupId = 0;

    for (const snap of timeline) {
      if (snap.event.type === 'BLOCK_ENTER' && snap.event.blockType === 'iteration') {
        // Start a new iteration group
        if (currentGroup) result.push(currentGroup);
        currentGroup = { id: `iter-${groupId++}`, type: 'iteration', snapshots: [snap] };
      } else if (snap.event.type === 'FUNCTION_ENTER') {
        if (currentGroup) result.push(currentGroup);
        currentGroup = { id: `fn-${groupId++}`, type: 'function', label: snap.event.fn, snapshots: [snap] };
      } else if (snap.event.type === 'BLOCK_EXIT' || snap.event.type === 'FUNCTION_EXIT') {
        if (currentGroup) {
          currentGroup.snapshots.push(snap);
          result.push(currentGroup);
          currentGroup = null;
        }
      } else {
        // Standard step
        if (currentGroup) {
          currentGroup.snapshots.push(snap);
        } else {
          // If no active group, make a standalone node
          result.push({ id: `step-${groupId++}`, type: 'step', snapshots: [snap] });
        }
      }
    }
    
    if (currentGroup) result.push(currentGroup);
    return result;
  }, [timeline]);

  // Auto-scroll logic (only vertically in this unrolled list)
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector('.node-active');
      if (activeEl) {
        // Adjust scroll position to center the active node vertically
        const container = containerRef.current;
        const scrollTarget = (activeEl as HTMLElement).offsetTop - (container.clientHeight / 2) + 100;
        
        container.scrollTo({
          top: Math.max(0, scrollTarget),
          behavior: 'smooth'
        });
      }
    }
  }, [currentStep]);

  if (timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 font-mono text-sm">
        No execution trace available.
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#050508] overflow-auto select-none p-12"
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
          setScale(s => Math.min(Math.max(s * zoomFactor, 0.4), 2));
        }
      }}
    >
      {/* Subtle Dot Grid Background matching screenshot */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.15] z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', 
          backgroundSize: '20px 20px',
          minHeight: '200%' // Ensure pattern covers scrolling
        }} 
      />

      <div 
        className="relative flex flex-col items-center gap-0 z-10 w-full min-h-max pb-32 origin-top"
        style={{ transform: `scale(${scale})` }}
      >
        {/* Starting Trigger Node */}
        <div className="px-4 py-1.5 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded bg-emerald-500/10 mb-8 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          Trigger Run
        </div>

        {aggregatedNodes.map((node, index) => {
          // A group is "active" if the current step falls within its snapshots
          const isActive = node.snapshots.some(s => s.step === currentStep);

          return (
            <div key={node.id} className="flex flex-col items-center">
              {/* Vertical connecting line from above */}
              <div className="w-[1px] h-6 bg-white/10" />
              
              {/* The "+" button exactly like UnifyApps */}
              <div className="w-4 h-4 rounded-sm border border-white/20 bg-[#0a0a0f] flex items-center justify-center text-white/40 mb-1 z-10 cursor-pointer hover:bg-white/10 hover:text-white transition-colors">
                <Plus size={10} />
              </div>
              
              <div className="w-[1px] h-6 bg-white/10" />

              {/* The Node Card */}
              <div className={`shrink-0 ${isActive ? 'node-active' : ''}`}>
                <FlowNode 
                  nodeData={node} 
                  isActive={isActive} 
                  currentStep={currentStep}
                  onClick={(step) => setCurrentStep(step)}
                />
              </div>
            </div>
          );
        })}

        {/* Final End Node */}
        <div className="flex flex-col items-center mt-0">
          <div className="w-[1px] h-6 bg-white/10" />
          <div className="w-4 h-4 rounded-sm border border-white/20 bg-[#0a0a0f] flex items-center justify-center text-white/40 mb-1 z-10 cursor-pointer hover:bg-white/10">
            <Plus size={10} />
          </div>
          <div className="w-[1px] h-6 bg-white/10" />
          <div className="w-12 h-8 border border-white/20 border-dashed rounded flex items-center justify-center text-white/30 text-lg bg-[#0a0a0f]">
            +
          </div>
        </div>
      </div>

      {/* Controls overlay */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 bg-black/50 p-2 rounded-lg border border-white/10 backdrop-blur-md z-50">
        <button className="text-white/50 hover:text-white flex items-center justify-center w-6 h-6" onClick={() => setScale(s => Math.min(s * 1.2, 2))}>+</button>
        <button className="text-white/50 hover:text-white flex items-center justify-center w-6 h-6" onClick={() => setScale(s => Math.max(s * 0.8, 0.4))}>-</button>
        <button className="text-[10px] font-mono text-white/50 hover:text-white mt-1" onClick={() => setScale(1)}>1:1</button>
      </div>
    </div>
  );
}
