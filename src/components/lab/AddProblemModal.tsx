import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { generateProblemTemplate } from '@/engine/llmClient';
import type { Problem } from '@/store/labStore';
import { v4 as uuidv4 } from 'uuid';

interface AddProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (problem: Problem) => void;
}

export default function AddProblemModal({ isOpen, onClose, onSave }: AddProblemModalProps) {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [description, setDescription] = useState('');
  const [defaultCode, setDefaultCode] = useState('');
  const [defaultInput, setDefaultInput] = useState('{}');
  
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!title.trim()) {
      alert('Please enter a problem title first (e.g. "Reverse Linked List")');
      return;
    }

    setIsGenerating(true);
    try {
      const template = await generateProblemTemplate(title);
      setDescription(template.description || '');
      setDefaultInput(template.defaultInput || '{}');
      setDefaultCode(template.code || '');
    } catch (err: any) {
      alert(err.message || 'Failed to auto-generate problem. Ensure Ollama is running.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!title.trim() || !description.trim()) {
      alert('Title and description are required.');
      return;
    }

    const newProblem: Problem = {
      id: uuidv4(),
      title,
      difficulty,
      tags: ['Custom'],
      description,
      examples: [], // Could be expanded later
      solutions: [
        {
          name: 'My Solution',
          language: 'javascript',
          complexity: { time: 'O(?)', space: 'O(?)' },
          code: defaultCode,
        }
      ],
      structures: ['array'], // Basic default
      defaultInput,
    };

    onSave(newProblem);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0a0a12] border border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col"
        >
          <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              ➕ Create Custom Problem
            </h2>
            <button onClick={onClose} className="p-1 text-white/50 hover:bg-white/10 rounded">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-white/60 uppercase">Problem Title</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Reverse Linked List"
                    className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !title.trim()}
                    className="px-4 py-2 bg-violet-600/20 text-violet-400 border border-violet-500/30 rounded flex items-center gap-2 hover:bg-violet-600/30 transition-colors disabled:opacity-50 text-sm font-semibold whitespace-nowrap"
                  >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    AI Auto-Fill
                  </button>
                </div>
              </div>
              <div className="w-32 space-y-1">
                <label className="text-xs font-semibold text-white/60 uppercase">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/60 uppercase">Description (Markdown)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the problem..."
                className="w-full h-32 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 font-mono resize-none"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-white/60 uppercase">Default Input (JSON)</label>
                <textarea
                  value={defaultInput}
                  onChange={(e) => setDefaultInput(e.target.value)}
                  placeholder="{}"
                  className="w-full h-24 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 font-mono resize-none"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-white/60 uppercase">Starter Code</label>
                <textarea
                  value={defaultCode}
                  onChange={(e) => setDefaultCode(e.target.value)}
                  placeholder="function solution() {}"
                  className="w-full h-24 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 font-mono resize-none"
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="px-6 py-2 bg-white text-black text-sm font-bold rounded hover:bg-white/90 transition-colors">
              Save & Open
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
