import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Problem } from '@/store/labStore';

export async function GET() {
  try {
    const problems = await prisma.problem.findMany();
    // Parse JSON strings back to objects
    const parsedProblems: Problem[] = problems.map(p => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty as 'Easy' | 'Medium' | 'Hard',
      tags: JSON.parse(p.tags),
      description: p.description,
      examples: JSON.parse(p.examples),
      solutions: JSON.parse(p.solutions),
      structures: JSON.parse(p.structures),
      defaultInput: p.defaultInput,
      testCases: p.testCases ? JSON.parse(p.testCases) : undefined,
    }));
    return NextResponse.json(parsedProblems);
  } catch (error: any) {
    console.error('Error fetching problems:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const problem: Problem = await req.json();

    if (!problem.id || !problem.title) {
      return NextResponse.json({ error: 'Invalid problem data: missing id or title' }, { status: 400 });
    }

    const created = await prisma.problem.create({
      data: {
        id: problem.id,
        title: problem.title,
        difficulty: problem.difficulty,
        tags: JSON.stringify(problem.tags || []),
        description: problem.description,
        examples: JSON.stringify(problem.examples || []),
        solutions: JSON.stringify(problem.solutions || []),
        structures: JSON.stringify(problem.structures || []),
        defaultInput: problem.defaultInput || '{}',
        testCases: JSON.stringify(problem.testCases || []),
        isBuiltIn: false,
      }
    });

    return NextResponse.json({ success: true, message: 'Problem saved successfully', id: created.id });
  } catch (error: any) {
    console.error('Error saving problem:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
