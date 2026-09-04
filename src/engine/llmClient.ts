export interface LLMResponse {
  content: string;
  error?: string;
}

export async function askTutor(problemTitle: string, problemDescription: string, userCode: string, question: string): Promise<string> {
  const prompt = `You are LogicLens, an expert algorithmic tutor. 
The user is working on the problem: "${problemTitle}".
Description: ${problemDescription}

Their current code is:
\`\`\`
${userCode}
\`\`\`

The user asks: "${question}"

Please provide a concise, helpful, and educational response. Do not give away the full answer immediately; act as a tutor guiding them.`;

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2', // Assumes llama3.2 is installed, can fallback to others
        prompt: prompt,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to connect to Ollama. Make sure Ollama is running and llama3 is pulled.');
    }

    const data = await res.json();
    return data.response;
  } catch (err: any) {
    if (err.message.includes('Failed to fetch')) {
      throw new Error('Could not connect to local AI. Is Ollama running on port 11434?');
    }
    throw new Error(err.message || 'Error connecting to Local LLM');
  }
}

export async function analyzeCode(problemTitle: string, problemDescription: string, userCode: string, errorContext?: string): Promise<string> {
  const prompt = `You are LogicLens, an expert algorithmic tutor. 
The user is working on the problem: "${problemTitle}".
Description: ${problemDescription}

Their current code is:
\`\`\`
${userCode}
\`\`\`

${errorContext ? `The code failed with the following error/test case:\n${errorContext}\n` : `The user wants a code review to optimize time/space complexity.\n`}

Provide a concise, conversational code review. Point out the specific flaw, bug, or inefficiency (e.g., "You're looping twice, making it O(n²)", or "Your pointer is going out of bounds"). Give a hint on how to fix it, but DO NOT provide the fully corrected code. Keep your response under 4 sentences.`;

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: prompt,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to connect to Ollama. Make sure Ollama is running and llama3.2 is pulled.');
    }

    const data = await res.json();
    return data.response;
  } catch (err: any) {
    if (err.message.includes('Failed to fetch')) {
      throw new Error('Could not connect to local AI. Is Ollama running on port 11434?');
    }
    throw new Error(err.message || 'Error connecting to Local LLM');
  }
}

export async function generateConceptualView(problemTitle: string, problemDescription: string): Promise<{ problemConcept: string, optimalConcept: string, graphic?: string[] }> {
  const prompt = `You are an expert algorithm explainer. Generate a conceptual breakdown for the problem: "${problemTitle}".
Description: ${problemDescription}

CRITICAL RULE: DO NOT write any actual code (no JavaScript, no C++, etc) in your response unless explicitly asked. Explain concepts purely in plain English.

Output ONLY valid JSON matching this schema exactly, with NO markdown formatting, NO backticks, and NO extra text:
{
  "problemConcept": "A 1-2 sentence simple explanation of the core problem.",
  "optimalConcept": "A 2-3 sentence explanation of the optimal approach (e.g. HashMap, Two Pointers). DO NOT write code here.",
  "graphic": [
    "A simple text trace or data state. Do NOT draw ASCII boxes like +---+. Use simple array syntax [1, 2, 3] and carets ^ to point to elements if needed. Do NOT write code here."
  ]
}
Ensure the graphic array contains clean, readable lines of text simulating an execution trace without actual code syntax.`;

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: prompt,
        stream: false,
        format: 'json', // Force JSON mode
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to connect to Ollama.');
    }

    const data = await res.json();
    return JSON.parse(data.response);
  } catch (err: any) {
    throw new Error('Failed to generate conceptual view using Local LLM: ' + err.message);
  }
}

export async function generateProblemTemplate(problemTitle: string, rawDescription?: string): Promise<any> {
  const prompt = `You are an expert algorithm problem parser and creator. 
Title: "${problemTitle}"
Raw Input/Description: """${rawDescription || ''}"""

Your task:
1. If Raw Input is provided, rewrite and beautify it into a clean Markdown description. If it's empty, invent a classic algorithm description for the title.
2. Extract all test cases from the Raw Input. Carefully VALIDATE the expected output of each test case mathematically/logically. If the raw text implies an output that is mathematically incorrect based on the rules, correct the output.
3. Format the test cases strictly into a JSON array where 'input' is a flat key-value object of the variables, and 'expected' is the primitive return value or array.
4. Based on the problem description, identify the primary algorithm tags (e.g. Array, String, Math, Tree, Hash Table, Dynamic Programming, Sorting, Graph, Matrix, Two Pointers). Return an array of strings. Do not use 'Custom'.

Output ONLY valid JSON matching this schema exactly, with NO markdown formatting, NO backticks, and NO extra text:
{
  "description": "A detailed 3-4 sentence explanation of the problem in clean markdown.",
  "examples": [
    { "input": "string representation of input", "output": "string representation of output" }
  ],
  "defaultInput": "A JSON string representing the default variables for the execution environment, e.g. '{ \\"nums\\": [1, 2, 3] }'",
  "code": {
    "javascript": "JUST the boilerplate function signature with an empty body and default return. Format it with proper newlines and indentation. DO NOT write the actual solution logic.",
    "cpp": "JUST the boilerplate function signature in C++ with an empty body and default return. Format it properly with newlines and indentation. Include necessary headers like <vector>, <string>, etc. DO NOT write the actual solution logic."
  },
  "tags": ["Array", "String", "Math", "Tree", "Hash Table", "Dynamic Programming", "Sorting", "Graph", "Matrix", "Two Pointers"],
  "structures": ["array"],
  "testCases": [
    { "input": { "n": 4, "a": [7, 15, 6, 3], "h": 8 }, "expected": 5 }
  ]
}`;

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: prompt,
        stream: false,
        format: 'json',
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to connect to Ollama.');
    }

    const data = await res.json();
  } catch (err: any) {
    throw new Error('Failed to auto-generate problem template: ' + err.message);
  }
}

export async function generateExpectedOutput(problemTitle: string, problemDescription: string, inputJson: string): Promise<any> {
  const prompt = `You are an expert algorithm solver.
Problem: "${problemTitle}"
Description: ${problemDescription}

Input Test Case (JSON):
${inputJson}

Your task: Solve the problem for this specific input. Return ONLY the expected output mathematically/logically.
You MUST wrap your output in a JSON object with a single key "expected".
For example, if the answer is \`false\`, return:
{ "expected": false }
If the answer is \`5\`, return:
{ "expected": 5 }
If the answer is \`[1, 2]\`, return:
{ "expected": [1, 2] }

Do not include markdown formatting, no backticks, and NO extra text. ONLY the JSON object.`;

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: prompt,
        stream: false,
        format: 'json',
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to connect to Ollama.');
    }

    const data = await res.json();
    const parsed = JSON.parse(data.response);
    return parsed.expected !== undefined ? parsed.expected : parsed;
  } catch (err: any) {
    throw new Error('Failed to auto-generate expected output: ' + err.message);
  }
}
