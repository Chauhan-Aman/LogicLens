/**
 * Seed script: loads all static JSON problems into SQLite
 * Run with: npx tsx prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const problemsDir = path.join(__dirname, '..', 'src', 'data', 'problems');
  const files = fs.readdirSync(problemsDir).filter(f => f.endsWith('.json'));

  let seeded = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(problemsDir, file);
    const problem = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const existing = await prisma.problem.findUnique({ where: { id: problem.id } });
    if (existing) {
      console.log(`  skip: ${problem.id} (already in DB)`);
      skipped++;
      continue;
    }

    await prisma.problem.create({
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
        isBuiltIn: true,
      }
    });

    console.log(`  seeded: ${problem.id}`);
    seeded++;
  }

  console.log(`\nDone! Seeded ${seeded}, skipped ${skipped} problems.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
