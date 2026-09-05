import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'LogicLens — Interactive Algorithm Execution Laboratory',
  description: 'See your algorithms think. Step through DSA problems with a live execution engine, variable tracking, and interactive visualizations.',
};

const FEATURE_CARDS = [
  {
    icon: '⚡',
    title: 'Live Execution Engine',
    description: 'Instrument your JavaScript code and watch it execute step-by-step, with full variable and memory tracking.',
  },
  {
    icon: '🗺️',
    title: 'Dynamic Visualizers',
    description: 'Arrays, HashMaps, Sets, Stacks and more — auto-detected from your code and rendered in real-time.',
  },
  {
    icon: '⏱️',
    title: 'Time-Travel Debugging',
    description: 'Scrub through any step of execution. Jump forward or backward instantly to understand exactly what happened.',
  },
  {
    icon: '📚',
    title: 'Living Problem Collection',
    description: 'Every problem you commit to the repo becomes part of an interactive portfolio. Add a JSON file, get a full simulation.',
  },
];

export default async function HomePage() {
  const problems = await prisma.problem.findMany({
    include: { savedSolutions: true }
  });

  const stats = {
    problems: problems.length,
    solutions: problems.reduce((a, p) => a + (JSON.parse(p.solutions).length) + p.savedSolutions.length, 0),
    tags: [...new Set(problems.flatMap(p => JSON.parse(p.tags as string) as string[]))].length,
  };

  return (
    <main className="min-h-screen bg-[#080810] text-white">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-violet-600/10 blur-[100px]" />
          <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] rounded-full bg-cyan-600/8 blur-[80px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                LL
              </div>
              <span className="font-bold text-lg tracking-tight">LogicLens</span>
            </div>
            <Link
              href="/lab"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-sm font-medium transition-all"
            >
              Open Lab →
            </Link>
          </nav>

          {/* Hero text */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Interactive Algorithm Execution Laboratory
            </div>

            <h1 className="text-5xl font-black leading-tight tracking-tight mb-6">
              See your algorithms{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                think.
              </span>
            </h1>

            <p className="text-lg text-white/50 leading-relaxed max-w-2xl mb-10">
              Don&apos;t just solve DSA problems — <strong className="text-white/80">watch them execute</strong>.
              LogicLens is a runtime simulator that tracks every variable, array access, and HashMap
              operation as your algorithm runs, step by step.
            </p>

            <div className="flex items-center gap-4">
              <Link
                href="/lab"
                id="cta-open-lab"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold text-sm shadow-2xl shadow-violet-500/20 transition-all duration-200"
              >
                Open the Lab ⚡
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10 text-sm font-medium text-white/70 hover:text-white transition-all"
              >
                GitHub →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: stats.problems, label: 'Problems' },
            { value: stats.solutions, label: 'Solutions' },
            { value: stats.tags, label: 'Concepts' },
          ].map(stat => (
            <div
              key={stat.label}
              className="flex flex-col items-center py-6 rounded-2xl bg-white/3 border border-white/8"
            >
              <span className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                {stat.value}
              </span>
              <span className="text-xs text-white/30 font-mono mt-1 uppercase tracking-widest">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Built different</h2>
        <p className="text-white/40 text-sm text-center mb-10">
          Not a static animation site. A real execution engine.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {FEATURE_CARDS.map(f => (
            <div
              key={f.title}
              className="p-5 rounded-2xl bg-white/3 border border-white/8 hover:border-white/15 hover:bg-white/5 transition-all"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Problem Grid preview ─── */}
      <section className="max-w-6xl mx-auto px-6 py-12 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Problem Collection</h2>
          <Link href="/lab" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
            Open all →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {problems.map(p => {
            const tags = JSON.parse(p.tags as string) as string[];
            return (
              <Link
                key={p.id}
                href={`/lab?problem=${p.id}`}
                className="p-4 rounded-xl bg-white/3 border border-white/8 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold group-hover:text-violet-300 transition-colors">
                    {p.title}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                    p.difficulty === 'Easy' ? 'bg-emerald-500/15 text-emerald-400' :
                    p.difficulty === 'Medium' ? 'bg-yellow-500/15 text-yellow-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>
                    {p.difficulty}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.slice(0, 2).map(t => (
                    <span key={t} className="text-[10px] text-white/30 font-mono">#{t}</span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/8 py-8 text-center">
        <p className="text-xs text-white/20 font-mono">
          LogicLens · Interactive Algorithm Execution Laboratory · Built with Next.js
        </p>
      </footer>
    </main>
  );
}
