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

Output ONLY valid JSON matching this schema exactly, with NO markdown formatting, NO backticks, and NO extra text:
{
  "problemConcept": "A 1-2 sentence simple explanation of the core problem.",
  "optimalConcept": "A 2-3 sentence explanation of the optimal approach (e.g. HashMap, Two Pointers).",
  "graphic": [
    "A simple text trace or data state. Do NOT draw ASCII boxes like +---+. Use simple array syntax [1, 2, 3] and carets ^ to point to elements if needed."
  ]
}
Ensure the graphic array contains clean, readable lines of text simulating an execution trace.`;

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

Output ONLY valid JSON matching this schema exactly, with NO markdown formatting, NO backticks, and NO extra text:
{
  "description": "A detailed 3-4 sentence explanation of the problem in clean markdown.",
  "examples": [
    { "input": "string representation of input", "output": "string representation of output" }
  ],
  "defaultInput": "A JSON string representing the default variables for the execution environment, e.g. '{ \\"nums\\": [1, 2, 3] }'",
  "code": "A basic function signature in Javascript/TypeScript solving the problem, with a return statement.",
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
    return JSON.parse(data.response);
  } catch (err: any) {
    throw new Error('Failed to auto-generate problem template: ' + err.message);
  }
}
