'use client';

import { useLabStore } from '@/store/labStore';
import { useRef, useEffect, useState } from 'react';
import FlowNode from './FlowNode';
import type { StateSnapshot } from '@/engine/events';

interface LayoutNode {
  id: string;
  snap: StateSnapshot;
  x: number;
  y: number;
}

interface LayoutEdge {
  id: string;
  source: LayoutNode;
  target: LayoutNode;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 90;
const X_SPACING = 40;
const Y_SPACING = 60;

export default function FlowGraph() {
  const { timeline, currentStep, setCurrentStep } = useLabStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Calculate layout
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  // Filter out pure variable updates to keep the graph sparse and readable, 
  // UNLESS it's a very short timeline.
  const significantSnaps = timeline.length < 15 
    ? timeline 
    : timeline.filter(s => 
        s.event.type !== 'VARIABLE_UPDATE' && 
        s.event.type !== 'ANNOTATION'
      );

  // If there are ANY function calls, we use a Tree layout (y = depth).
  // Otherwise, we use a Linear layout wrapped into rows.
  const hasRecursion = significantSnaps.some(s => s.recursiveDepth > 0);

  if (hasRecursion) {
    // Tree Layout: X = sequential, Y = depth
    const yOffsets = new Map<number, number>(); // track last X per depth to prevent overlap?
    // Actually, simpler: X is just index, Y is depth.
    significantSnaps.forEach((snap, i) => {
      nodes.push({
        id: `node-${snap.step}`,
        snap,
        x: i * (NODE_WIDTH + X_SPACING),
        y: snap.recursiveDepth * (NODE_HEIGHT + Y_SPACING),
      });
    });
  } else {
    // Linear wrap layout
    const columns = 4;
    significantSnaps.forEach((snap, i) => {
      const row = Math.floor(i / columns);
      const col = i % columns;
      // Zig-zag? No, just left to right, then wrap around
      nodes.push({
        id: `node-${snap.step}`,
        snap,
        x: col * (NODE_WIDTH + X_SPACING),
        y: row * (NODE_HEIGHT + Y_SPACING),
      });
    });
  }

  // Connect edges sequentially
  for (let i = 1; i < nodes.length; i++) {
    edges.push({
      id: `edge-${i}`,
      source: nodes[i - 1],
      target: nodes[i],
    });
  }

  // Auto-pan to current node
  useEffect(() => {
    const activeNode = nodes.find(n => n.snap.step === currentStep);
    if (activeNode && containerRef.current) {
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      setPan({
        x: (w / 2) - (activeNode.x * scale) - (NODE_WIDTH * scale / 2),
        y: (h / 2) - (activeNode.y * scale) - (NODE_HEIGHT * scale / 2),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]); // Don't depend on scale/nodes or it fights user panning

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
      className="relative w-full h-full bg-[#050508] overflow-hidden select-none"
      onWheel={(e) => {
        // Zoom
        if (e.deltaY !== 0) {
          const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
          setScale(s => Math.min(Math.max(s * zoomFactor, 0.2), 2));
        }
      }}
      onMouseDown={(e) => {
        setIsDragging(true);
        setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }}
      onMouseMove={(e) => {
        if (isDragging) {
          setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
        }
      }}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      <div 
        className="absolute origin-top-left will-change-transform"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
      >
        <svg 
          className="absolute inset-0 pointer-events-none" 
          style={{ width: 10000, height: 10000, overflow: 'visible' }} // Big enough bounds
        >
          {/* Grid pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Edges */}
          {edges.map(edge => {
            const sx = edge.source.x + (NODE_WIDTH / 2);
            const sy = edge.source.y + (NODE_HEIGHT / 2);
            const tx = edge.target.x + (NODE_WIDTH / 2);
            const ty = edge.target.y + (NODE_HEIGHT / 2);

            let d = '';
            if (hasRecursion) {
              // Curved paths for tree (down/right)
              d = `M ${sx} ${sy + (NODE_HEIGHT/2)} C ${sx} ${ty - (NODE_HEIGHT/2) - 20}, ${tx} ${sy + (NODE_HEIGHT/2) + 20}, ${tx} ${ty - (NODE_HEIGHT/2)}`;
            } else {
              // Straight/L-shaped paths for grid
              d = `M ${sx} ${sy} L ${tx} ${ty}`;
            }

            return (
              <g key={edge.id}>
                {/* Glow/shadow */}
                <path d={d} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                {/* Main line */}
                <path 
                  d={d} 
                  fill="none" 
                  stroke="rgba(255,255,255,0.2)" 
                  strokeWidth="2" 
                  strokeDasharray="4 4"
                  markerEnd="url(#arrow)"
                />
              </g>
            );
          })}

          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.3)" />
            </marker>
          </defs>
        </svg>

        {/* Nodes (HTML overlay) */}
        {nodes.map(node => (
          <div 
            key={node.id} 
            className="absolute"
            style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
          >
            <FlowNode 
              snap={node.snap} 
              isActive={currentStep === node.snap.step} 
              onClick={() => setCurrentStep(node.snap.step)}
            />
          </div>
        ))}
      </div>

      {/* Controls overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 bg-black/50 p-2 rounded-lg border border-white/10 backdrop-blur-md">
        <button className="text-white/50 hover:text-white" onClick={() => setScale(s => Math.min(s * 1.2, 2))}>+</button>
        <button className="text-white/50 hover:text-white" onClick={() => setScale(s => Math.max(s * 0.8, 0.2))}>-</button>
        <button className="text-[10px] font-mono text-white/50 hover:text-white mt-1" onClick={() => { setScale(1); setPan({x:40, y:40}); }}>reset</button>
      </div>
    </div>
  );
}
