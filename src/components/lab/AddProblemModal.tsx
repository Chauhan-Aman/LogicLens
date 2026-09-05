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
  const [defaultCode, setDefaultCode] = useState<Record<string, string>>({
    javascript: '',
    cpp: ''
  });
  const [activeLang, setActiveLang] = useState<'javascript' | 'cpp'>('javascript');
  const [defaultInput, setDefaultInput] = useState('{}');
  const [testCasesJson, setTestCasesJson] = useState('[]');
  const [examples, setExamples] = useState<{ input: string, output: string }[]>([]);
  const [tags, setTags] = useState<string[]>(['Uncategorized']);
  
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!title.trim()) {
      alert('Please enter a problem title first (e.g. "Reverse Linked List")');
      return;
    }

    setIsGenerating(true);
    try {
      const template = await generateProblemTemplate(title, description);
      setDescription(template.description || '');
      setDefaultInput(template.defaultInput || '{}');
      if (typeof template.code === 'string') {
        setDefaultCode({ javascript: template.code, cpp: '' });
      } else if (template.code) {
        setDefaultCode({
          javascript: template.code.javascript || '',
          cpp: template.code.cpp || ''
        });
      }
      if (template.testCases) {
        setTestCasesJson(JSON.stringify(template.testCases, null, 2));
      }
      if (template.examples) {
        setExamples(template.examples);
      }
      if (template.tags && Array.isArray(template.tags) && template.tags.length > 0) {
        setTags(template.tags);
      } else {
        setTags(['Uncategorized']); // Fallback
      }
    } catch (err: any) {
      alert(err.message || 'Failed to auto-generate problem. Ensure Ollama is running.');
    } finally {
      setIsGenerating(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      alert('Title and description are required.');
      return;
    }

    let parsedTestCases;
    try {
      parsedTestCases = JSON.parse(testCasesJson);
      if (!Array.isArray(parsedTestCases)) {
        throw new Error('Test cases must be an array');
      }
    } catch (err) {
      alert('Test Cases must be a valid JSON array.');
      return;
    }

    const newProblemId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newProblem: Problem = {
      id: newProblemId || uuidv4(),
      title,
      difficulty,
      tags,
      description,
      examples: examples,
      testCases: parsedTestCases,
      solutions: [
        {
          name: 'JavaScript Solution',
          language: 'javascript',
          complexity: { time: 'O(?)', space: 'O(?)' },
          code: defaultCode.javascript,
        },
        {
          name: 'C++ Solution',
          language: 'cpp',
          complexity: { time: 'O(?)', space: 'O(?)' },
          code: defaultCode.cpp,
        }
      ],
      structures: ['array'], // Basic default
      defaultInput,
    };

    setIsSaving(true);
    try {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProblem)
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      onSave(newProblem);
      onClose();
    } catch (err: any) {
      alert('Failed to save problem: ' + err.message);
    } finally {
      setIsSaving(false);
    }
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
                <label className="text-xs font-semibold text-white/60 uppercase">Test Cases (JSON)</label>
                <textarea
                  value={testCasesJson}
                  onChange={(e) => setTestCasesJson(e.target.value)}
                  placeholder="[{}]"
                  className="w-full h-24 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 font-mono resize-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/60 uppercase">Starter Code</label>
                <div className="flex bg-black/40 rounded border border-white/10 overflow-hidden">
                  <button 
                    onClick={() => setActiveLang('javascript')}
                    className={`px-2 py-1 text-xs font-medium transition-colors ${activeLang === 'javascript' ? 'bg-violet-500/20 text-violet-300' : 'text-white/40 hover:text-white/60'}`}
                  >
                    JavaScript
                  </button>
                  <button 
                    onClick={() => setActiveLang('cpp')}
                    className={`px-2 py-1 text-xs font-medium transition-colors border-l border-white/10 ${activeLang === 'cpp' ? 'bg-violet-500/20 text-violet-300' : 'text-white/40 hover:text-white/60'}`}
                  >
                    C++
                  </button>
                </div>
              </div>
              <textarea
                value={defaultCode[activeLang]}
                onChange={(e) => setDefaultCode(prev => ({ ...prev, [activeLang]: e.target.value }))}
                placeholder={activeLang === 'javascript' ? "function solution() {}" : "#include <iostream>\nusing namespace std;\n\nvoid solution() {}"}
                className="w-full h-24 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 font-mono resize-none"
              />
            </div>
          </div>

          <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold rounded-lg shadow-lg shadow-violet-500/20 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : 'Save Problem'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
