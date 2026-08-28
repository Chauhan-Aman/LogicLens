import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'LogicLens — Interactive Algorithm Execution Laboratory',
  description: 'See your algorithms think. Step through DSA problems with a live execution engine, variable tracking, and real-time visualizations.',
  keywords: ['DSA', 'algorithm', 'visualizer', 'execution', 'debugger', 'leetcode', 'data structures'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-[#080810] text-white">
        {children}
      </body>
    </html>
  );
}
