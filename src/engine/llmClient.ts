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
