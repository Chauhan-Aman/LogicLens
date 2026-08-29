'use client';

import { useLabStore } from '@/store/labStore';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { askTutor, generateConceptualView } from '@/engine/llmClient';
import { Sparkles, Send, Loader2 } from 'lucide-react';

export default function ConceptualVisualizer() {
  const { activeProblem, userCode } = useLabStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedConcept, setGeneratedConcept] = useState<{ problemConcept: string, optimalConcept: string, graphic?: string[] } | null>(null);
  
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'tutor', content: string }[]>([]);
  const [isChatting, setIsChatting] = useState(false);

  if (!activeProblem) {
    return null;
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await generateConceptualView(activeProblem.title, activeProblem.description);
      setGeneratedConcept(res);
    } catch (err) {
      console.error(err);
      alert('Failed to generate conceptual view using Ollama. Ensure Ollama is running.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const question = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: question }]);
    
    setIsChatting(true);
    try {
      const res = await askTutor(activeProblem.title, activeProblem.description, userCode, question);
      setChatHistory(prev => [...prev, { role: 'tutor', content: res }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'tutor', content: 'Sorry, I failed to connect to Ollama.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  // Use JSON schema first, fallback to generated concept if available
  const concept = activeProblem.conceptualView || generatedConcept;

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#0a0a12] flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto mt-4 w-full flex-grow"
      >
        <h2 className="text-lg font-bold text-white/90 mb-6 flex items-center gap-2">
          <span className="text-violet-400">💡</span> {activeProblem.title}
        </h2>
        
        {concept ? (
          <div className="space-y-6 text-left">
            <h3 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2">Problem Concept</h3>
            <p className="text-sm text-white/60">{concept.problemConcept}</p>
            
            <h3 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2 mt-8">Optimal Solution Concept</h3>
            <p className="text-sm text-white/60">{concept.optimalConcept}</p>
            
            {concept.graphic && concept.graphic.length > 0 && (
               <div className="bg-white/5 p-4 rounded-lg mt-4 font-mono text-xs text-white/50 whitespace-pre">
                 {concept.graphic.map((line, i) => (
                   <div key={i}>{line}</div>
                 ))}
               </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 text-center py-8">
             <p className="text-sm text-white/50">
              No conceptual view is defined in this problem's JSON file.
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-violet-600/20 text-violet-400 border border-violet-500/30 rounded-lg hover:bg-violet-600/30 transition-colors disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isGenerating ? 'Generating...' : 'AI Generate Concept'}
            </button>
          </div>
        )}

        <div className="mt-12 border-t border-white/10 pt-6">
          <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-violet-400" /> AI Tutor
          </h3>
          <div className="bg-white/5 rounded-lg border border-white/10 h-64 flex flex-col">
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
              {chatHistory.length === 0 ? (
                <p className="text-xs text-white/40 text-center mt-8">Ask me anything about this problem or your code!</p>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={`text-xs ${msg.role === 'user' ? 'text-right text-white/80' : 'text-left text-violet-300'} whitespace-pre-wrap`}>
                    <span className={`inline-block px-3 py-2 rounded-lg ${msg.role === 'user' ? 'bg-white/10' : 'bg-violet-900/30'}`}>
                      {msg.content}
                    </span>
                  </div>
                ))
              )}
              {isChatting && (
                <div className="text-xs text-left text-violet-300">
                  <span className="inline-block px-3 py-2 rounded-lg bg-violet-900/30 flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" /> Thinking...
                  </span>
                </div>
              )}
            </div>
            <div className="border-t border-white/10 p-2 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChat()}
                placeholder="Ask a question..."
                className="flex-grow bg-black/40 border border-white/10 rounded px-3 text-xs text-white outline-none focus:border-violet-500/50"
              />
              <button
                onClick={handleChat}
                disabled={isChatting || !chatInput.trim()}
                className="p-2 bg-violet-600 text-white rounded hover:bg-violet-500 disabled:opacity-50 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
