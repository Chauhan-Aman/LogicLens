# LogicLens

LogicLens is an Interactive Algorithm Execution Laboratory. When you write code, the engine executes it and generates a step-by-step visual timeline from the execution events themselves. It's not a pre-scripted animation—it's a live replay of what actually happened during execution!

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router)
- **Database ORM**: [Prisma](https://www.prisma.io/) (with SQLite)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Styling**: Tailwind CSS
- **Transpilation Engine**: Custom Babel (JS) and Clang/Python (C++) AST transpilers to inject tracking calls automatically.

## Storage Architecture

LogicLens uses an API-centric model backed by **Prisma** and **SQLite** (`prisma/dev.db`).

- **Database**: All problems, saved user solutions, and test case overrides are stored securely in a local SQLite database.
- **Seeding Data**: The built-in, static problem definitions are stored as JSON files inside `prisma/seed-data/`. Run `npx prisma db seed` to initialize or reset your database with these core problems.
- **State Hydration**: On launch, the Zustand stores (`useCustomProblemsStore`, `useSavedSolutionsStore`, etc.) fetch the persisted data from Next.js API routes (`/api/*`), guaranteeing persistence across browser resets and dev server reloads.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You can start editing the app by modifying `app/page.tsx` or checking out the lab in `app/lab/page.tsx`.
