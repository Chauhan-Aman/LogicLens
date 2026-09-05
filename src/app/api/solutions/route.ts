import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { SavedSolution } from '@/store/savedSolutionsStore';

export async function GET() {
  try {
    const solutions = await prisma.savedSolution.findMany();
    const mapped: SavedSolution[] = solutions.map(s => ({
      id: s.id,
      problemId: s.problemId,
      name: s.name,
      language: s.language,
      code: s.code,
      timestamp: s.timestamp.getTime()
    }));
    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error('Error fetching solutions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { problemId, name, language, code } = body;

    const created = await prisma.savedSolution.create({
      data: {
        problemId,
        name,
        language,
        code
      }
    });

    return NextResponse.json({
      id: created.id,
      problemId: created.problemId,
      name: created.name,
      language: created.language,
      code: created.code,
      timestamp: created.timestamp.getTime()
    });
  } catch (error: any) {
    console.error('Error saving solution:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, code } = body;
    
    const updated = await prisma.savedSolution.update({
      where: { id },
      data: { code }
    });
    
    return NextResponse.json({ success: true, timestamp: updated.timestamp.getTime() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    
    await prisma.savedSolution.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
