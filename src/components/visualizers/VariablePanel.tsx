'use client';

import { motion } from 'framer-motion';

interface VariablePanelProps {
  variables: Record<string, unknown>;
}

export default function VariablePanel({ variables }: VariablePanelProps) {
  const entries = Object.entries(variables);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-white/20 text-sm font-mono">
        No variables yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {entries.map(([name, val]) => (
        <motion.div
          key={name}
          layout
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5 ring-1 ring-white/10"
        >
          <span className="text-xs font-mono text-cyan-400 font-semibold">{name}</span>
          <span className="text-xs font-mono text-white/70 truncate max-w-[80px]">
            {JSON.stringify(val)}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
