import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function generateCppInit(input: any): string {
  let cpp = '';
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      // Assuming array of ints for MVP
      cpp += `    std::vector<int> ${key} = {${value.join(', ')}};\n`;
    } else if (typeof value === 'number') {
      cpp += `    int ${key} = ${value};\n`;
    } else if (typeof value === 'string') {
      cpp += `    std::string ${key} = "${value}";\n`;
    } else if (typeof value === 'boolean') {
      cpp += `    bool ${key} = ${value ? 'true' : 'false'};\n`;
    }
  }
  return cpp;
}

export async function POST(req: Request) {
  try {
    const { code, input, language } = await req.json();

    if (language !== 'cpp') {
      return NextResponse.json({ error: 'Language not supported by this endpoint.' }, { status: 400 });
    }

    // Parse input JSON
    let parsedInput = {};
    try {
      parsedInput = JSON.parse(input);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid input JSON.' }, { status: 400 });
    }

    // Generate C++ wrapper
    const cppInit = generateCppInit(parsedInput);
    
    // We wrap the user's code in a main function
    const fullCode = `
#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <map>
#include <set>
#include <unordered_set>

using namespace std;

int main() {
${cppInit}

    // --- USER CODE ---
${code}
    // -----------------

    return 0;
}
`;

    // Create a temporary directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logiclens-cpp-'));
    const sourceFile = path.join(tempDir, 'main.cpp');
    const exeFile = path.join(tempDir, 'main.exe');
    
    fs.writeFileSync(sourceFile, fullCode);

    // 1. Run Python Transpiler
    const transpilerPath = path.join(process.cwd(), 'src', 'engine', 'cpp', 'transpiler.py');
    const headerPath = path.join(process.cwd(), 'src', 'engine', 'cpp');
    
    const transpilerProcess = spawn('python', [transpilerPath, sourceFile]);
    
    let transpiledCode = '';
    let transpilerError = '';

    transpilerProcess.stdout.on('data', (data) => { transpiledCode += data.toString(); });
    transpilerProcess.stderr.on('data', (data) => { transpilerError += data.toString(); });

    await new Promise((resolve) => transpilerProcess.on('close', resolve));

    if (transpilerError) {
      return NextResponse.json({ error: 'Transpiler Error: ' + transpilerError }, { status: 500 });
    }

    // Save transpiled code
    const transpiledFile = path.join(tempDir, 'transpiled.cpp');
    fs.writeFileSync(transpiledFile, transpiledCode);

    // 2. Compile with g++
    const compileProcess = spawn('g++', [transpiledFile, '-o', exeFile, '-I', headerPath, '-std=c++17']);
    let compileError = '';
    compileProcess.stderr.on('data', (data) => { compileError += data.toString(); });
    
    await new Promise((resolve) => compileProcess.on('close', resolve));

    if (compileError) {
      return NextResponse.json({ error: 'Compilation Error: ' + compileError }, { status: 400 });
    }

    // 3. Execute
    const execProcess = spawn(exeFile);
    let execOutput = '';
    let execError = '';
    
    execProcess.stdout.on('data', (data) => { execOutput += data.toString(); });
    execProcess.stderr.on('data', (data) => { execError += data.toString(); });

    await new Promise((resolve) => {
        execProcess.on('close', resolve);
        // Timeout after 5 seconds to prevent infinite loops
        setTimeout(() => {
            execProcess.kill();
            execError += '\\nExecution timed out (5s limit).';
            resolve(null);
        }, 5000);
    });

    if (execError) {
      return NextResponse.json({ error: execError }, { status: 400 });
    }

    // Parse JSON lines from stdout
    const events = execOutput.split('\\n')
      .filter(line => line.trim().startsWith('{'))
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(e => e !== null);

    return NextResponse.json({ events });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
