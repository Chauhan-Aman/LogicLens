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
      <section className="relative overflow-hidden min-h-[90vh] flex flex-col justify-center">
        {/* Background glow & Grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white/5 blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-400 flex items-center justify-center text-black text-xs font-bold">
                LL
              </div>
              <span className="font-bold text-lg tracking-tight">LogicLens</span>
            </div>
            <Link
              href="/lab"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-sm font-medium transition-all shadow-lg"
            >
              Open Lab →
            </Link>
          </nav>

          {/* Hero text */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-xs font-mono mb-6 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Interactive Algorithm Execution Laboratory
            </div>

            <h1 className="text-5xl font-black leading-tight tracking-tight mb-6">
              See your algorithms{' '}
              <span className="bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
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
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-sm shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Open the Lab ⚡
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-sm text-sm font-medium text-white/80 hover:text-white transition-all duration-300"
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
              className="relative overflow-hidden flex flex-col items-center py-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-white/20 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 text-4xl font-black bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
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
              className="relative overflow-hidden p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-white/20 hover:bg-white/10 transition-all duration-300 group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 text-2xl mb-4 p-3 rounded-2xl bg-white/5 inline-block">{f.icon}</div>
              <h3 className="relative z-10 font-bold text-base mb-2 group-hover:text-white transition-colors">{f.title}</h3>
              <p className="relative z-10 text-sm text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Problem Grid preview ─── */}
      <section className="max-w-6xl mx-auto px-6 py-12 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Problem Collection</h2>
          <Link href="/lab" className="text-sm text-zinc-400 hover:text-white transition-colors">
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
                className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-white/20 hover:bg-white/10 hover:-translate-y-1 hover:shadow-xl hover:shadow-white/5 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold group-hover:text-white transition-colors">
                    {p.title}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${p.difficulty === 'Easy' ? 'bg-emerald-500/15 text-emerald-400' :
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
