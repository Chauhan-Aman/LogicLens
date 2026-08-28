'use client';

import { useLabStore } from '@/store/labStore';
import { useRef, useEffect, useState, useMemo } from 'react';
import FlowNode from './FlowNode';
import { ArrowRight, ChevronDown, ChevronRight, GitBranch, Play, Plus, RefreshCcw, Variable, ChevronLeft, Maximize, Minimize } from 'lucide-react';
import type { StateSnapshot } from '@/engine/events';
import { motion, AnimatePresence } from 'framer-motion';

export interface ExecutionNode {
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
      while (stack.length > 1 && stack[stack.length - 1].type !== 'function') stack.pop();
      if (stack.length > 1) stack.pop();
    } else if (snap.event.type === 'BLOCK_ENTER') {
      if (snap.event.blockType === 'iteration' && currentBlock.type === 'iteration') {
        stack.pop(); // auto-close previous iteration
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
      if (stack.length > 1 && stack[stack.length - 1].type !== 'function') {
        stack.pop();
      }
    } else {
      const lastChild = currentBlock.children[currentBlock.children.length - 1];
      if (lastChild && lastChild.type === 'step' && snap.event.type === 'VARIABLE_UPDATE' && lastChild.snapshots[lastChild.snapshots.length - 1].event.type === 'VARIABLE_UPDATE') {
        lastChild.snapshots.push(snap);
      } else {
        currentBlock.children.push({
          id: `step-${snap.step}`,
          type: 'step',
          snapshots: [snap],
          children: []
        });
      }
    }
  }
  return root;
}

// ─── RECURSIVE NODE COMPONENTS ────────────────────────────────────────────────

function TreeStep({ node, currentStep, setCurrentStep }: { node: ExecutionNode, currentStep: number, setCurrentStep: (s: number) => void }) {
  if (node.snapshots.length === 0) return null;
  const isActive = node.snapshots.some(s => s.step === currentStep);
  
  // Use the last snapshot for getting the core event details (e.g. clicking it jumps to the last step in the group)
  const mainSnap = node.snapshots[node.snapshots.length - 1];
  
  return (
    <div className="flex flex-col items-center">
      <div className="w-[1px] h-4 bg-white/10" />
      <div 
        onClick={() => setCurrentStep(mainSnap.step)}
        className="w-4 h-4 rounded-sm border border-white/20 bg-[#0a0a0f] flex items-center justify-center text-white/40 mb-1 z-10 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
      >
        <Plus size={10} />
      </div>
      <div className="w-[1px] h-4 bg-white/10" />
      <div className={`shrink-0 ${isActive ? 'node-active' : ''}`} onClick={() => setCurrentStep(mainSnap.step)}>
        <FlowNode 
          nodeData={{ id: node.id, type: 'step', snapshots: node.snapshots }} 
          isActive={isActive} 
          currentStep={currentStep}
          onClick={(step) => setCurrentStep(step)}
        />
      </div>
    </div>
  );
}

function TreeIteration({ node, currentStep, setCurrentStep, index }: { node: ExecutionNode, currentStep: number, setCurrentStep: (s: number) => void, index?: number }) {
  // Check if any child step is currently active
  const isActive = React.useMemo(() => {
    const checkActive = (n: ExecutionNode): boolean => {
      if (n.snapshots.some(s => s.step === currentStep)) return true;
      return n.children.some(checkActive);
    };
    return checkActive(node);
  }, [node, currentStep]);

  const [isExpanded, setIsExpanded] = useState(isActive);

  // Auto-expand if a child becomes active
  useEffect(() => {
    if (isActive) setIsExpanded(true);
  }, [isActive]);

  // Aggregate variables for the iteration summary
  const varsSet = new Map<string, unknown>();
  let lastComparison: StateSnapshot | null = null;
  
  // Recursively find variables set in this iteration
  const extractVars = (n: ExecutionNode) => {
    for (const snap of n.snapshots) {
      if (snap.event.type === 'VARIABLE_UPDATE' && snap.event.variable) {
        varsSet.set(snap.event.variable, snap.event.value);
      }
      if (snap.event.type === 'COMPARISON') {
        lastComparison = snap;
      }
    }
    n.children.forEach(extractVars);
  };
  extractVars(node);

  const varsString = Array.from(varsSet.entries()).map(([k, v]) => `${k} = ${v}`).join(', ');
  const title = index !== undefined 
    ? (varsString ? `Iteration ${index} (${varsString})` : `Iteration ${index}`) 
    : (varsString ? `Iteration (${varsString})` : 'Iteration');

  const isSuccess = lastComparison && (lastComparison as any).event.result === true;
  const borderColor = isActive ? 'border-indigo-500 ring-1 ring-indigo-500/50 bg-indigo-500/10' : 'border-white/10 bg-[#111115] hover:border-white/20';

  return (
    <div className="grid grid-cols-[1fr_340px_1fr] w-full">
      <div /> {/* Left empty space to keep center balanced */}
      
      <div className="flex flex-col items-center w-full">
        <div className="w-[1px] h-4 bg-white/10" />
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`relative w-[340px] rounded-lg border ${borderColor} p-3 flex items-center justify-between cursor-pointer transition-all duration-200 z-10 shadow-lg`}
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-indigo-400">
              <RefreshCcw size={12} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-white/90 truncate max-w-[200px]">{title}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-wider">Iter Cycle</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
             {isSuccess && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
             {isExpanded ? <ChevronDown size={14} className="text-white/40" /> : <ChevronRight size={14} className="text-white/40" />}
          </div>
        </div>
      </div>

      <div className="flex items-start">
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-start overflow-hidden pt-4"
            >
              {/* Horizontal branch line */}
              <div className="w-8 h-[1px] bg-indigo-500/30 mt-[22px] shrink-0" />
              
              {/* Children container with vertical spine */}
              <div className="flex flex-col items-center relative border-l border-indigo-500/30 pl-6 py-2 bg-indigo-500/[0.02] rounded-r-2xl border-t border-b min-w-[300px]">
                {node.children.map(child => (
                   <TreeNode key={child.id} node={child} currentStep={currentStep} setCurrentStep={setCurrentStep} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TreeLoop({ node, currentStep, setCurrentStep }: { node: ExecutionNode, currentStep: number, setCurrentStep: (s: number) => void }) {
  // Check if any child step is currently active
  const isActive = React.useMemo(() => {
    const checkActive = (n: ExecutionNode): boolean => {
      if (n.snapshots.some(s => s && (s as any).event && s.step === currentStep)) return true;
      return n.children.some(checkActive);
    };
    return checkActive(node);
  }, [node, currentStep]);

  const [isExpanded, setIsExpanded] = useState<boolean>(isActive || true); // default expanded

  useEffect(() => {
    if (isActive) setIsExpanded(true);
  }, [isActive]);

  let childrenToRender: React.ReactNode[] = [];
  if (node.children.length <= 6) {
    childrenToRender = node.children.map((child, i) => (
      <TreeNode key={child.id} node={child} currentStep={currentStep} setCurrentStep={setCurrentStep} index={i + 1} />
    ));
  } else {
    // Find active index
    const activeIndex = node.children.findIndex(c => {
      const checkActive = (n: ExecutionNode): boolean => {
        if (n.snapshots.some(s => s && (s as any).event && s.step === currentStep)) return true;
        return n.children.some(checkActive);
      };
      return checkActive(c);
    });

    const renderNode = (child: ExecutionNode, i: number) => (
      <TreeNode key={child.id} node={child} currentStep={currentStep} setCurrentStep={setCurrentStep} index={i + 1} />
    );

    const renderPlaceholder = (count: number, key: string) => (
      <div key={key} className="flex flex-col items-center my-2 opacity-50">
        <div className="w-[1px] h-4 bg-white/10" />
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-white/50 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          {count} iterations skipped
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        </div>
        <div className="w-[1px] h-4 bg-white/10" />
      </div>
    );

    const showIndices = new Set([0, 1, node.children.length - 1]);
    if (activeIndex !== -1) {
      showIndices.add(activeIndex - 1);
      showIndices.add(activeIndex);
      showIndices.add(activeIndex + 1);
    }
    
    const validIndices = Array.from(showIndices).filter(i => i >= 0 && i < node.children.length).sort((a,b) => a-b);
    
    let lastIndex = -1;
    for (const i of validIndices) {
      if (i > lastIndex + 1) {
        childrenToRender.push(renderPlaceholder(i - lastIndex - 1, `skip-${lastIndex}-${i}`));
      }
      childrenToRender.push(renderNode(node.children[i], i));
      lastIndex = i;
    }
  }

  const borderColor = isActive ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-blue-500/10' : 'border-white/20 bg-[#0a0a0f] hover:border-white/40';

  return (
    <div className="flex flex-col items-center w-full my-4">
      {/* The Flowchart Loop Node */}
      <div className="w-[1px] h-6 bg-white/10" />
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-[340px] rounded-lg border ${borderColor} p-4 flex items-center justify-between cursor-pointer transition-all duration-300 z-10 shrink-0 shadow-lg`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
            <RefreshCcw size={16} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-mono font-bold text-white/90">
              {node.label ? `${node.label.toUpperCase()} LOOP` : 'LOOP'}
            </span>
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              Iterative Block
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 border-l border-white/10 pl-4">
          <div className="flex flex-col text-right hidden sm:flex">
             <span className="text-[10px] text-white/40 uppercase tracking-wider">Logic</span>
             <span className="text-xs font-mono text-white/60">Condition check</span>
          </div>
          {isExpanded ? <ChevronDown size={16} className="text-white/40" /> : <ChevronRight size={16} className="text-white/40" />}
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col items-center w-full"
          >
            {/* Center Orthogonal Connector Spine */}
            <div className="w-[1px] h-6 bg-blue-500/30" />
            <div className="w-full flex flex-col items-center relative pb-4">
               {/* The main vertical timeline spine */}
               <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-blue-500/20 -translate-x-1/2" />
               
               {/* Return Arrow Path (Looping back) */}
               <div className="absolute top-[-24px] bottom-0 left-1/2 w-[220px] border-t border-r border-b border-blue-500/20 rounded-r-xl pointer-events-none" />
               {/* Arrowhead pointing left at the top */}
               <div className="absolute top-[-29px] left-1/2 translate-x-[40px] text-blue-500/50">
                 <ChevronLeft size={12} />
               </div>

               <div className="relative z-10 w-full flex flex-col items-center gap-1">
                 {childrenToRender}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TreeNode({ node, currentStep, setCurrentStep, index }: { node: ExecutionNode, currentStep: number, setCurrentStep: (s: number) => void, index?: number }) {
  if (node.type === 'loop') return <TreeLoop node={node} currentStep={currentStep} setCurrentStep={setCurrentStep} />;
  if (node.type === 'iteration') return <TreeIteration node={node} currentStep={currentStep} setCurrentStep={setCurrentStep} index={index} />;
  
  // function or step
  if (node.children.length === 0) return <TreeStep node={node} currentStep={currentStep} setCurrentStep={setCurrentStep} />;
  
  // Just render children (transparent pass-through for 'Program' or 'function' wrapper)
  return (
    <>
      {node.children.map(child => (
        <TreeNode key={child.id} node={child} currentStep={currentStep} setCurrentStep={setCurrentStep} />
      ))}
    </>
  );
}

import React from 'react';

export default function FlowGraph() {
  const { timeline, currentStep, setCurrentStep } = useLabStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow drag if clicking on the background, not on a node
    if ((e.target as HTMLElement).closest('.z-10')) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault(); // Prevent text selection
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({
      x: dragStart.current.panX + dx,
      y: dragStart.current.panY + dy,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Group raw timeline by detecting implicit iterations if explicit blocks are missing.
  // This is a heuristic for C++ runs which don't emit BLOCK_ENTER natively.
  const processedTimeline = useMemo(() => {
    // If we have explicit BLOCK_ENTER, the AST transpiler is working (e.g. JS).
    if (timeline.some(s => s.event.type === 'BLOCK_ENTER')) return timeline;

    // Otherwise, attempt to auto-group by repeating variable sets
    // A simple heuristic: if we see the same variable assigned consecutively, it might be an iteration.
    // However, without AST, it's very hard to perfectly reconstruct a loop.
    // For now, if there are no blocks, the execution tree will just be a flat list of TreeSteps.
    return timeline;
  }, [timeline]);

  const tree = useMemo(() => buildExecutionTree(processedTimeline), [processedTimeline]);

  // Auto-scroll logic (via pan)
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector('.node-active');
      if (activeEl) {
        const container = containerRef.current;
        // offsetTop is in unscaled document space relative to origin-top flex container
        const targetY = (activeEl as HTMLElement).offsetTop * scale;
        const centerOffset = container.clientHeight / 2;
        // Adjust pan to center the active element vertically
        setPan(prev => ({ ...prev, y: Math.min(0, centerOffset - targetY - 100) }));
      }
    }
  }, [currentStep, scale]);

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
      className={`${isFullscreen ? 'fixed inset-0 z-[9999]' : 'relative w-full h-full'} bg-[#050508] overflow-hidden select-none p-12 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
          setScale(s => Math.min(Math.max(s * zoomFactor, 0.4), 2));
        }
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.15] z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', 
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }} 
      />

      <div 
        className="relative flex flex-col items-center gap-0 z-10 w-full min-h-max origin-center transition-transform duration-75"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
      >
        <div className="px-4 py-1.5 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded bg-emerald-500/10 mb-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          Trigger Run
        </div>

        <TreeNode node={tree} currentStep={currentStep} setCurrentStep={setCurrentStep} />

        <div className="flex flex-col items-center mt-0">
          <div className="w-[1px] h-6 bg-white/10" />
          <div className="w-12 h-8 border border-white/20 border-dashed rounded flex items-center justify-center text-white/30 text-lg bg-[#0a0a0f]">
            +
          </div>
        </div>
      </div>

      <div className={`absolute ${isFullscreen ? 'top-8 right-8' : 'top-6 right-6'} flex flex-col gap-2 bg-black/50 p-2 rounded-lg border border-white/10 backdrop-blur-md z-50`}>
        <button title="Zoom In" className="text-white/50 hover:text-white flex items-center justify-center w-6 h-6" onClick={() => setScale(s => Math.min(s * 1.2, 2))}>+</button>
        <button title="Zoom Out" className="text-white/50 hover:text-white flex items-center justify-center w-6 h-6" onClick={() => setScale(s => Math.max(s * 0.8, 0.4))}>-</button>
        <button title="Reset Zoom" className="text-[10px] font-mono text-white/50 hover:text-white mt-1" onClick={() => setScale(1)}>1:1</button>
        <div className="w-full h-[1px] bg-white/10 my-1" />
        <button 
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          className="text-white/50 hover:text-white flex items-center justify-center w-6 h-6" 
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
        </button>
      </div>
    </div>
  );
}
