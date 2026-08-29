# LogicLens

LogicLens is an Interactive Algorithm Execution Laboratory. When you write code, the engine executes it and generates a step-by-step visual timeline from the execution events themselves. It's not a pre-scripted animation—it's a live replay of what actually happened during execution!

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Styling**: Tailwind CSS
- **Transpilation Engine**: Custom Babel (JS) and Clang/Python (C++) AST transpilers to inject tracking calls automatically.

## Storage Architecture & Future Roadmap

Currently, LogicLens operates completely client-side.
- **Problem Data**: Stored in local JSON files (`src/data/problems/`).
- **Saved Solutions**: Persisted using Zustand `persist` middleware in your browser's **Local Storage**. This works perfectly for a local desktop experience (handling hundreds of solutions safely up to ~5MB).

> [!IMPORTANT]
> **Database Migration Requirement:** As the problem collection grows (e.g. past 100+ problems), and to support multi-device syncing, user accounts, and cloud persistence, **LogicLens must be migrated to a real database (e.g., MongoDB, PostgreSQL, Supabase).** This will require building a backend API and replacing the Local Storage strategy with secure database schemas.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You can start editing the app by modifying `app/page.tsx` or checking out the lab in `app/lab/page.tsx`.
