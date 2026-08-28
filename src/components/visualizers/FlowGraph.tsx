'use client';

import { useLabStore } from '@/store/labStore';
import { useRef, useEffect } from 'react';
import FlowNode from './FlowNode';
import type { StateSnapshot } from '@/engine/events';
import { ArrowRight } from 'lucide-react';

interface ExecutionNode {
  id: string;
  type: 'function' | 'loop' | 'iteration' | 'step';
  label?: string;
  children: ExecutionNode[];
  snapshots: StateSnapshot[];
}

function buildExecutionTree(timeline: StateSnapshot[]): ExecutionNode {
  const root: ExecutionNode = { id: 'root', type: 'function', label: 'Program', children: [], snapshots: [] };
  const stack = [root];

  for (const snap of timeline) {
    const currentBlock = stack[stack.length - 1];

    if (snap.event.type === 'FUNCTION_ENTER') {
      const fnNode: ExecutionNode = { 
        id: `fn-${snap.step}`, 
        type: 'function', 
        label: `${snap.event.fn}()`, 
        children: [], 
        snapshots: [] 
      };
      currentBlock.children.push(fnNode);
      stack.push(fnNode);
    } else if (snap.event.type === 'FUNCTION_EXIT') {
      // auto-close any unclosed loops/iterations in this function
      while (stack.length > 1 && stack[stack.length - 1].type !== 'function') {
        stack.pop();
      }
      if (stack.length > 1) stack.pop(); // pop the function itself
    } else if (snap.event.type === 'BLOCK_ENTER') {
      // If we see an 'iteration', auto-close the previous 'iteration' if it wasn't closed (e.g. continue)
      if (snap.event.blockType === 'iteration' && currentBlock.type === 'iteration') {
        stack.pop();
      }

      const blockNode: ExecutionNode = { 
        id: `block-${snap.step}`, 
        type: (snap.event.blockType as any) || 'loop', 
        label: snap.event.blockLabel, 
        children: [], 
        snapshots: [] 
      };
      stack[stack.length - 1].children.push(blockNode);
      stack.push(blockNode);
    } else if (snap.event.type === 'BLOCK_EXIT') {
      // Don't pop if we are at root or function
      if (stack.length > 1 && stack[stack.length - 1].type !== 'function') {
        stack.pop();
      }
    } else {
      // It's a standard step (VARIABLE_UPDATE, COMPARISON, etc.)
      // Skip pure variable updates unless it's a very short trace
      if (timeline.length > 15 && (snap.event.type === 'VARIABLE_UPDATE' || snap.event.type === 'ANNOTATION')) {
        continue;
      }
      currentBlock.children.push({
        id: `step-${snap.step}`,
        type: 'step',
        snapshots: [snap],
        children: []
      });
    }
  }
  
  return root;
}

export default function FlowGraph() {
  const { timeline, currentStep, setCurrentStep } = useLabStore();
  const containerRef = useRef<HTMLDivElement>(null);

  if (timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 font-mono text-sm">
        No execution trace available.
      </div>
    );
  }

  const tree = buildExecutionTree(timeline);

  // Auto-scroll to active node
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector('.node-active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  }, [currentStep]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#050508] overflow-auto p-8 relative">
       {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
      
      <div className="relative">
        {/* Skip the dummy 'Program' root if it only has one actual function child */}
        {tree.children.length === 1 && tree.children[0].type === 'function' 
          ? <ExecutionBlock node={tree.children[0]} currentStep={currentStep} onStepClick={setCurrentStep} />
          : <ExecutionBlock node={tree} currentStep={currentStep} onStepClick={setCurrentStep} />
        }
      </div>
    </div>
  );
}

function ExecutionBlock({ 
  node, 
  currentStep, 
  onStepClick 
}: { 
  node: ExecutionNode; 
  currentStep: number; 
  onStepClick: (step: number) => void; 
}) {
  if (node.type === 'step' && node.snapshots.length > 0) {
    const snap = node.snapshots[0];
    const isActive = snap.step === currentStep;
    return (
      <div className={`shrink-0 ${isActive ? 'node-active' : ''}`}>
        <FlowNode 
          snap={snap} 
          isActive={isActive} 
          onClick={() => onStepClick(snap.step)}
        />
      </div>
    );
  }

  // Filter out empty container blocks
  const validChildren = node.children.filter(c => c.type !== 'step' || c.snapshots.length > 0);
  if (validChildren.length === 0) return null;

  let borderColor = 'border-white/10';
  let bgColor = 'bg-white/[0.02]';
  let labelColor = 'text-white/40';

  if (node.type === 'function') {
    borderColor = 'border-violet-500/30';
    bgColor = 'bg-violet-500/[0.02]';
    labelColor = 'text-violet-300';
  } else if (node.type === 'loop') {
    borderColor = 'border-cyan-500/30';
    bgColor = 'bg-cyan-500/[0.02]';
    labelColor = 'text-cyan-300';
  } else if (node.type === 'iteration') {
    borderColor = 'border-white/5';
    bgColor = 'bg-transparent';
    labelColor = 'text-white/20';
  }

  const isVertical = node.type === 'function' || node.type === 'loop';

  return (
    <div className={`relative flex flex-col p-4 rounded-xl border ${borderColor} ${bgColor} min-w-min`}>
      <div className={`absolute -top-3 left-4 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest bg-[#0a0a0f] border ${borderColor} ${labelColor}`}>
        {node.type} {node.label ? `— ${node.label}` : ''}
      </div>

      <div className={`mt-2 flex ${isVertical ? 'flex-col gap-6' : 'flex-row flex-wrap gap-4 items-center'}`}>
        {validChildren.map((child, i) => (
          <div key={child.id} className="flex items-center gap-4">
            <ExecutionBlock node={child} currentStep={currentStep} onStepClick={onStepClick} />
            
            {/* Draw arrow to next sibling if horizontal layout (iterations) */}
            {!isVertical && i < validChildren.length - 1 && (
              <ArrowRight size={14} className="text-white/10 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
