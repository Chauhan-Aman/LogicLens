import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function sanitizeError(errorStr: string, tempDir: string): string {
    let sanitized = errorStr;
    // Strip exact temporary directory and workspace path if present
    sanitized = sanitized.split(tempDir).join('');
    sanitized = sanitized.split(process.cwd()).join('');
    
    // Use regex to replace any remaining absolute paths (C:\folder\file.cpp:) with just the filename (file.cpp:)
    sanitized = sanitized.replace(/(?:[A-Za-z]:)?[\\/][a-zA-Z0-9_\-\.\s\\/]+[\\/]([a-zA-Z0-9_\-\.]+):/g, '$1:');
    
    // Map internal filenames to friendly names
    sanitized = sanitized.replace(/transpiled\.cpp/g, 'solution.cpp');
    sanitized = sanitized.replace(/LogicLens\.h/g, 'system_headers.h');
    
    // Clean up any stray slashes left behind
    sanitized = sanitized.replace(/^[\\/]+/gm, '');
    
    return sanitized;
}

function generateCppInit(input: any): string {
  let cppDecls = '';
  let cppTrackers = '';
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      cppDecls += `std::vector<int> ${key} = {${value.join(', ')}};\n`;
      cppTrackers += `        __ll_set_var("${key}", ${key});\n`;
    } else if (typeof value === 'number') {
      cppDecls += `int ${key} = ${value};\n`;
      cppTrackers += `        __ll_set_var("${key}", ${key});\n`;
    } else if (typeof value === 'string') {
      cppDecls += `std::string ${key} = "${value}";\n`;
      cppTrackers += `        __ll_set_var("${key}", ${key});\n`;
    } else if (typeof value === 'boolean') {
      cppDecls += `bool ${key} = ${value ? 'true' : 'false'};\n`;
      cppTrackers += `        __ll_set_var("${key}", ${key});\n`;
    }
  }

  return `
${cppDecls}

struct __LL_Init {
    __LL_Init() {
${cppTrackers}
    }
} __ll_init_instance;
`;
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
    
    const fullCode = `
#include "LogicLens.h"

// --- INJECTED GLOBAL INPUTS ---
${cppInit}
// ------------------------------

// --- USER CODE ---
${code}
// -----------------
`;

    // Create a temporary directory in the project workspace to avoid OS AppLocker/Temp directory restrictions
    const baseTempDir = path.join(process.cwd(), '.next', 'cache', 'logiclens-cpp');
    if (!fs.existsSync(baseTempDir)) {
      fs.mkdirSync(baseTempDir, { recursive: true });
    }
    const tempDir = fs.mkdtempSync(path.join(baseTempDir, 'run-'));
    const sourceFile = path.join(tempDir, 'source.cpp');
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
      return NextResponse.json({ error: 'Compilation Error:\n\n' + sanitizeError(compileError, tempDir) }, { status: 400 });
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

    // Debugging logs
    fs.writeFileSync(path.join(tempDir, 'debug.log'), `Output:\\n${execOutput}\\nError:\\n${execError}`);
    fs.writeFileSync(path.join(tempDir, 'debug.log'), `Output:\n${execOutput}\nError:\n${execError}`);

    if (execError) {
      return NextResponse.json({ error: sanitizeError(execError, tempDir) }, { status: 400 });
    }

    // Parse JSON lines from stdout
    const events = execOutput.split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('{')) {
          try { return JSON.parse(trimmed); } catch (e) { /* fallback to text */ }
        }
        // Convert any standard output (like cout) into an ANNOTATION event
        return { type: "ANNOTATION", payload: { message: trimmed } };
      })
      .filter(e => e !== null);

    return NextResponse.json({ events, debugOutput: execOutput });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
