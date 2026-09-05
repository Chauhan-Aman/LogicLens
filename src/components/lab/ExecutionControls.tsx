'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronFirst, ChevronLast, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLabStore } from '@/store/labStore';

const SPEED_OPTIONS = [0.5, 1, 2, 4, 8];

export default function ExecutionControls() {
  const {
    timeline,
    currentStep,
    setCurrentStep,
    isPlaying,
    setIsPlaying,
    playSpeed,
    setPlaySpeed,
  } = useLabStore();

  const totalSteps = timeline.length - 1;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stepForward = useCallback(() => {
    setCurrentStep(Math.min(currentStep + 1, totalSteps));
  }, [currentStep, totalSteps, setCurrentStep]);

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
      const delay = Math.round(800 / playSpeed);
      intervalRef.current = setInterval(() => {
        const { currentStep: cs, timeline: tl } = useLabStore.getState();
        if (cs >= tl.length - 1) {
          setIsPlaying(false);
        } else {
          setCurrentStep(cs + 1);
        }
      }, delay);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playSpeed, setCurrentStep, setIsPlaying]);

  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  if (timeline.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Timeline scrubber */}
      <div className="relative flex items-center gap-3">
        <span className="text-xs font-mono text-white/40 w-8 text-right shrink-0">
          {currentStep}
        </span>
        <div className="relative flex-1 h-1 bg-white/10 rounded-full cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            setCurrentStep(Math.round(ratio * totalSteps));
          }}
        >
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-zinc-300"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
          {/* Thumb */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg ring-2 ring-zinc-400/50 -ml-1.5 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all"
            style={{ left: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-mono text-white/40 w-8 shrink-0">{totalSteps}</span>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        {/* Playback buttons */}
        <div className="flex items-center gap-1">
          <ControlBtn
            icon={<ChevronFirst size={15} />}
            label="First"
            onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
            disabled={currentStep === 0}
          />
          <ControlBtn
            icon={<SkipBack size={15} />}
            label="Back"
            onClick={() => { setCurrentStep(Math.max(0, currentStep - 1)); setIsPlaying(false); }}
            disabled={currentStep === 0}
          />
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={currentStep >= totalSteps && !isPlaying}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-zinc-200 text-black shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-1" />}
          </button>
          <ControlBtn
            icon={<SkipForward size={15} />}
            label="Forward"
            onClick={() => { stepForward(); setIsPlaying(false); }}
            disabled={currentStep >= totalSteps}
          />
          <ControlBtn
            icon={<ChevronLast size={15} />}
            label="Last"
            onClick={() => { setCurrentStep(totalSteps); setIsPlaying(false); }}
            disabled={currentStep >= totalSteps}
          />
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1.5">
          <Zap size={12} className="text-white/40" />
          <div className="flex gap-1">
            {SPEED_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setPlaySpeed(s)}
                className={`text-xs font-mono px-2 py-1 rounded-md transition-all duration-150 ${
                  playSpeed === s
                    ? 'bg-white text-black font-bold ring-1 ring-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlBtn({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {icon}
    </button>
  );
}
