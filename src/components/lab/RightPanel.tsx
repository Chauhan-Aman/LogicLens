'use client';

import { useState } from 'react';
import VisualizationPanel from './VisualizationPanel';
import ExecutionTraceTable from './ExecutionTraceTable';
import { useLabStore } from '@/store/labStore';
import { Eye, List, Lightbulb, BookOpen, GitMerge } from 'lucide-react';

import ConceptualVisualizer from './ConceptualVisualizer';
import FlowGraph from '../visualizers/FlowGraph';

export default function RightPanel() {
  const [activeTab, setActiveTab] = useState<'visualizer' | 'flow' | 'trace' | 'conceptual'>('visualizer');
  const { activeProblem } = useLabStore();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs Header */}
      <div className="flex items-center gap-1 px-4 pt-2 border-b border-white/5 bg-[#080810] shrink-0">
        <TabButton 
          id="visualizer" 
          active={activeTab === 'visualizer'} 
          onClick={() => setActiveTab('visualizer')}
          icon={<Eye size={14} />}
          label="Execution Visualizer"
        />
        <TabButton 
          id="flow" 
          active={activeTab === 'flow'} 
          onClick={() => setActiveTab('flow')}
          icon={<GitMerge size={14} />}
          label="Flow Graph"
        />
        <TabButton 
          id="trace" 
          active={activeTab === 'trace'} 
          onClick={() => setActiveTab('trace')}
          icon={<List size={14} />}
          label="Trace Table"
        />
        <TabButton 
          id="conceptual" 
          active={activeTab === 'conceptual'} 
          onClick={() => setActiveTab('conceptual')}
          icon={<Lightbulb size={14} />}
          label="Conceptual View"
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden relative bg-[#0a0a12]">
        {activeTab === 'visualizer' && <VisualizationPanel />}
        {activeTab === 'flow' && <FlowGraph />}
        {activeTab === 'trace' && <ExecutionTraceTable />}
        {activeTab === 'conceptual' && <ConceptualVisualizer />}
      </div>
    </div>
  );
}

function TabButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  id: string; 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
        active
          ? 'text-zinc-100 border-zinc-100 bg-white/5'
          : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
