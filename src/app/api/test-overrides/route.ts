import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const overrides = await prisma.testOverride.findMany();
    const mapped: Record<string, any[]> = {};
    for (const o of overrides) {
      mapped[o.problemId] = JSON.parse(o.testCases);
    }
    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error('Error fetching test overrides:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { problemId, testCases } = body;

    const upserted = await prisma.testOverride.upsert({
      where: { problemId },
      update: { testCases: JSON.stringify(testCases) },
      create: {
        problemId,
        testCases: JSON.stringify(testCases)
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving test override:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
