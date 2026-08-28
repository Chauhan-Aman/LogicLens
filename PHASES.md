# LogicLens — Phase-Wise Development Roadmap

> **LogicLens** is an Interactive Algorithm Execution Laboratory — not a traditional "sorting visualizer."  
> When you write code, the engine actually executes it and generates a step-by-step visual timeline from the execution events themselves. The algorithm doesn't drive the animation — the execution generates events, and a visualization engine renders those events.

---

## Table of Contents

- [Vision](#vision)
- [Architecture Overview](#architecture-overview)
- [Phase 1 — Core Execution Lab](#phase-1--core-execution-lab-completed)
- [Phase 2 — Problem Collection UI](#phase-2--problem-collection-ui-completed)
- [Phase 3 — Timeline & State Engine](#phase-3--timeline--state-engine-completed)
- [Phase 4 — Visualizers](#phase-4--visualizers-completed)
- [Phase 5 — Problem Data Layer](#phase-5--problem-data-layer-completed)
- [Phase 6 — Multi-Language Backend (C++)](#phase-6--multi-language-backend-c-planned)
- [Phase 7 — Educational & Visual Suite](#phase-7--educational--visual-suite-completed)
- [Phase 8 — Pure Syntax JavaScript (AST Transpiler)](#phase-8--pure-syntax-javascript-ast-transpiler-completed)
- [Phase 9 — Solution Comparison Lab](#phase-9--solution-comparison-lab-planned)
- [Phase 10 — Complexity Laboratory](#phase-10--complexity-laboratory-planned)

---

## Vision

Most algorithm visualizers are hardcoded animations that play a preset sequence of steps. LogicLens is fundamentally different:

1. **You write real code** — either a pre-loaded solution or your own.
2. **LogicLens actually executes it** — the engine runs the code and intercepts every state change in real-time.
3. **A visualization engine renders the events** — not a pre-scripted animation, but a live replay of what actually happened during execution.
4. **You time-travel through execution** — step forward, step backward, jump to any point, watch variables and data structures update live.

This means **any correct algorithm** you write will visualize correctly. You are not limited to pre-built demos.

---

## Architecture Overview

```
User Code (Pure JS / C++)
        │
        ▼
┌─────────────────────┐
│  AST Transpiler     │  ← Babel (JS) / Clang (C++) rewrites your code
│  (astTranspiler.ts) │    to inject tracking calls automatically
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Execution Sandbox  │  ← new Function() (JS) / g++ subprocess (C++)
│  (executor.ts)      │    runs the instrumented code safely
└─────────────────────┘
        │ ExecutionEvent[]
        ▼
┌─────────────────────┐
│  State Engine       │  ← Converts flat event stream into
│  (stateEngine.ts)   │    time-travelable StateSnapshot[]
└─────────────────────┘
        │ StateSnapshot[]
        ▼
┌─────────────────────┐
│  Zustand Store      │  ← Global state: current step, timeline,
│  (labStore.ts)      │    active problem, error state
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Visualizers        │  ← ArrayRenderer, HashMapRenderer,
│  (components/)      │    VariablePanel, ExecutionTraceTable
└─────────────────────┘
```

### Core Event Types

| Event Type | Triggered When |
|---|---|
| `ARRAY_ACCESS` | `nums[i]` is read |
| `ARRAY_WRITE` | `nums[i] = value` is assigned |
| `ARRAY_SWAP` | Two array elements are swapped |
| `PUSH` / `POP` | Array push/pop operations |
| `MAP_INSERT` | `map.set(key, value)` |
| `MAP_LOOKUP` | `map.has(key)` or `map.get(key)` |
| `SET_INSERT` | `set.add(value)` |
| `SET_LOOKUP` | `set.has(value)` |
| `VARIABLE_UPDATE` | Any variable assignment is tracked |
| `COMPARISON` | A comparison operation is performed |
| `ANNOTATION` | `console.log()` in your code |

---

## Phase 1 — Core Execution Lab ✅ Completed

**Goal**: Build the foundational lab page where users can select a problem, view its code, and run it.

### What was built
- `src/app/lab/page.tsx` — The main lab layout with a 3-panel design:
  - **Left panel**: Problem description, examples, and solution selector
  - **Center panel**: Monaco code editor with syntax highlighting
  - **Right panel**: Visualization output area

### Key decisions
- Used **Monaco Editor** (the same editor as VS Code) for a premium code editing experience.
- Layout is fully responsive, using CSS Grid with fixed sidebars and a flexible center panel.
- The Zustand store (`labStore.ts`) is the single source of truth for the entire lab state.

---

## Phase 2 — Problem Collection UI ✅ Completed

**Goal**: Build a searchable, filterable problem library that users can browse before entering the lab.

### What was built
- `src/components/collection/ProblemCard.tsx` — Card component displaying:
  - Problem title, difficulty badge (Easy/Medium/Hard), and tags
  - Expected time/space complexity for each solution
  - Direct "Open in Lab" navigation

### Key decisions
- Problems are stored as static JSON files in `src/data/problems/` so they are version-controllable and easily extendable.
- Difficulty colors follow LeetCode conventions (green/yellow/red) for instant familiarity.

### Problem Library (current)
| Problem | Difficulty | Tags |
|---|---|---|
| Two Sum | Easy | Array, HashMap |
| Best Time to Buy and Sell Stock | Easy | Array, Sliding Window |
| Contains Duplicate | Easy | Array, Sorting |
| Valid Anagram | Easy | Array, HashMap, Sorting |
| Binary Search | Easy | Array, Binary Search |

---

## Phase 3 — Timeline & State Engine ✅ Completed

**Goal**: Turn a flat stream of execution events into a rich, time-travelable state machine.

### What was built
- `src/engine/events.ts` — TypeScript union type defining all `ExecutionEvent` variants.
- `src/engine/stateEngine.ts` — The core converter:
  - Takes `ExecutionEvent[]` as input
  - Produces `StateSnapshot[]` as output
  - Each `StateSnapshot` is a complete, self-contained picture of the program state at that moment (arrays, hashmaps, variables, active annotations)
- `src/engine/detector.ts` — Analyzes an event stream to identify which data structures are present (determines which visualizers to render).

### How time travel works
```
ExecutionEvent[]  →  StateSnapshot[0], StateSnapshot[1], ..., StateSnapshot[N]
                                              ↑
                                    currentStep (Zustand)
                                    
Clicking "Next" → currentStep + 1
Clicking "Prev" → currentStep - 1  
Clicking any step → jump directly
```
All O(1) — no re-execution needed.

---

## Phase 4 — Visualizers ✅ Completed

**Goal**: Build beautiful, animated visual components that render each `StateSnapshot`.

### What was built

#### `ArrayRenderer.tsx`
- Renders arrays as a horizontal row of animated cells
- **Active index** highlighted with a glowing violet ring
- **Written index** highlighted in amber/orange
- **Swapped indices** highlighted in green
- Smooth CSS transitions between states

#### `HashMapRenderer.tsx`
- Renders key→value pairs as a vertical list of cards
- Newly inserted entries animate in with a glow
- Recently looked-up entries pulse with an accent highlight
- Shows entry count and structure name

#### `VariablePanel.tsx`
- A compact panel showing all tracked variables and their current values
- Variables flash with a highlight color when their value changes
- Type-aware display (numbers, strings, booleans, arrays shown differently)

### Design System
All visualizers use a shared dark theme:
- **Background**: `#0a0a0f` deep dark
- **Accent**: Violet (`#7c3aed`) for active states
- **Highlight**: Amber for writes, Green for matches
- **Font**: `JetBrains Mono` for all code/value displays

---

## Phase 5 — Problem Data Layer ✅ Completed

**Goal**: Design a scalable JSON schema for defining problems, solutions, and test inputs.

### JSON Problem Schema
```json
{
  "id": "problem-id",
  "title": "Problem Title",
  "difficulty": "Easy | Medium | Hard",
  "tags": ["Array", "HashMap"],
  "description": "Problem statement with markdown support.",
  "examples": [
    { "input": "nums=[2,7], target=9", "output": "[0,1]" }
  ],
  "solutions": [
    {
      "name": "Solution Name",
      "complexity": { "time": "O(n)", "space": "O(n)" },
      "language": "javascript",
      "code": "// Pure JavaScript code here"
    }
  ],
  "structures": ["array", "hashmap"],
  "defaultInput": "{ \"nums\": [2, 7, 11, 15], \"target\": 9 }"
}
```

### Key decisions
- Multiple solutions per problem (e.g., Brute Force vs. Optimal) are supported natively.
- `structures` field tells the visualizer which renderers to activate before execution.
- `defaultInput` is editable JSON that users can modify freely in the UI.
- Adding a new problem = creating one new JSON file. No code changes required.

---

## Phase 6 — Multi-Language Backend (C++) 🚧 Planned

**Goal**: Enable users to write pure C++ code in the editor and have it compile, execute, and visualize exactly like JavaScript.

### Architecture
```
User writes pure C++ code
          │
          ▼
Next.js API Route (/api/execute/cpp)
          │
          ▼
Python/Clang AST transpiler rewrites standard C++ to emit JSON events
   e.g.  vector<int> nums = {2,7,11,15};
   →     vector<int> nums = {2,7,11,15}; __ll_emit_array("nums", nums);
          │
          ▼
g++ compiles the instrumented code → executable
          │
          ▼
Executable runs → emits JSON event stream to stdout
          │
          ▼
API route reads stdout → returns ExecutionEvent[] to frontend
          │
          ▼
Same state engine + visualizers handle it — language-agnostic!
```

### What will be built
- `api/execute/cpp/route.ts` — Next.js API route to receive C++ code + input
- `LogicLens.h` — C++ header that defines tracked event emission
- Python Clang transpiler — rewrites standard containers (`std::vector`, `std::unordered_map`) to emit events
- Backend compilation pipeline using `child_process` → `g++`
- Language dropdown in UI becomes fully functional for C++

### Pure C++ example (what you'll write)
```cpp
#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> map;

    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (map.count(complement)) {
            return {map[complement], i};
        }
        map[nums[i]] = i;
    }
    return {};
}
```

No macros. No `LL_SET_VAR`. Pure standard C++.

### Hosting note
> Requires a server with `g++` installed. Works locally out-of-the-box. For cloud deployment, will use a Dockerized execution sandbox or Railway/Render with a build pack that includes GCC.

---

## Phase 7 — Educational & Visual Suite ✅ Completed

**Goal**: Add educational tools that help users understand algorithms before and after execution.

### What was built

#### `ExecutionTraceTable.tsx`
A detailed, scrollable log of every execution event. Accessible via the "Trace Table" tab in the right panel.
- Shows step index, event type, variable name, and value at that exact moment
- Color-coded by event type (reads = blue, writes = amber, matches = green)
- Syncs with the current step slider — highlighted row follows playback

#### `ConceptualVisualizer.tsx`
A "before you run" educational panel. Accessible via the "Conceptual View" tab.
- Displays a plain-English explanation of how the optimal algorithm works
- Shows conceptual diagrams (e.g., how a HashMap eliminates the second loop in Two Sum)
- Helps users understand the *why* before diving into the *what* of the execution trace

#### Test Case Generator
Integrated into `CodeEditor.tsx` above the JSON input area.
- **"Generate Random Test Case"** button randomizes arrays in the input schema
- Instantly lets you test your solution against a different dataset without manual editing
- Randomizes array length (4-10 elements) and values within a sensible range

### RightPanel Tab System
The right panel now has three tabs:
| Tab | Content |
|---|---|
| **Execution Visualizer** | Array, HashMap, and Variable renderers |
| **Trace Table** | Step-by-step execution event log |
| **Conceptual View** | Algorithm explanation and concept diagrams |

---

## Phase 8 — Pure Syntax JavaScript (AST Transpiler) ✅ Completed

**Goal**: Eliminate all custom `__ll.*` API calls from user code. Users write 100% standard JavaScript.

### The Problem (before Phase 8)
```javascript
// Old — unnatural, requires knowing our API
const nums = __ll.array('nums', __input.nums);
const target = __input.target;
for (let i = 0; i < nums.length; i++) {
  __ll.setVar('i', i);  // ← boilerplate noise
  // ...
}
```

### The Solution (after Phase 8)
```javascript
// New — 100% pure JavaScript
for (let i = 0; i < nums.length; i++) {
  for (let j = i + 1; j < nums.length; j++) {
    let sum = nums[i] + nums[j];
    if (sum === target) {
      console.log(`Found! indices [${i}, ${j}]`);
      return [i, j];
    }
  }
}
```

### How it works — The Babel Pipeline

```
User writes pure JS
        │
        ▼
@babel/standalone parses code into AST
        │
        ▼
Custom Babel Plugin visits AST nodes:
  VariableDeclarator (let x = 5)
    → inserts __ll.setVar('x', x) after declaration
  
  AssignmentExpression (x = 10)
    → inserts __ll.setVar('x', x) after assignment
  
  NewExpression (new Map())
    → replaces with __ll.map('varName') — tracked proxy
  
  NewExpression (new Set())
    → replaces with __ll.set('varName') — tracked proxy
  
  CallExpression (console.log(...))
    → replaces with __ll.note(...) — captured as annotation event
        │
        ▼
Instrumented code runs in sandbox (new Function())
with input variables (nums, target, prices...)
injected directly into scope from JSON input
        │
        ▼
ExecutionEvent[] flows into StateEngine → StateSnapshot[] → Visualizers
```

### What the transpiler does automatically
| You write | LogicLens tracks |
|---|---|
| `let i = 0` | Variable `i` initialized to `0` |
| `i = i + 1` | Variable `i` updated |
| `nums[j]` | Array `nums` accessed at index `j` |
| `nums[i] = val` | Array `nums` written at index `i` |
| `new Map()` | Tracked Map proxy created |
| `map.set(k, v)` | `MAP_INSERT` event emitted |
| `map.has(k)` | `MAP_LOOKUP` event emitted |
| `new Set()` | Tracked Set proxy created |
| `console.log(msg)` | `ANNOTATION` event (shows in trace) |

---

## Phase 9 — Solution Comparison Lab 📋 Planned

**Goal**: Allow users to run two solutions side-by-side on the same input and compare their execution traces.

### Proposed UI
```
┌─────────────────────┬─────────────────────┐
│   Solution A        │   Solution B         │
│   Brute Force O(n²) │   HashMap O(n)       │
│                     │                      │
│   [Code Editor]     │   [Code Editor]      │
│                     │                      │
│   [Visualizer]      │   [Visualizer]       │
│                     │                      │
│   Steps: 14         │   Steps: 4           │
│   Events: 42        │   Events: 11         │
└─────────────────────┴─────────────────────┘
```

### What will be built
- Dual-pane lab layout with synchronized step controls (or independent)
- Step count and event count comparison sidebar
- Color-coded efficiency indicators
- Ability to load any two solutions from the problem's solution list side-by-side

---

## Phase 10 — Complexity Laboratory 📋 Planned

**Goal**: Empirically demonstrate time complexity by running solutions against exponentially growing input sizes and plotting the results.

### How it will work
1. User selects a problem and a solution.
2. LogicLens generates inputs of increasing sizes: `n = 10, 50, 100, 500, 1000, 5000`.
3. Each input is executed and the **step count** (execution events) is recorded.
4. Results are plotted on a live chart: `n` (x-axis) vs. `steps` (y-axis).
5. The empirical curve is fitted to a complexity class (O(n), O(n log n), O(n²)).

### What will be built
- Batch execution runner in `executor.ts`
- Input size generator per problem type
- Chart using `recharts` or `chart.js`
- Complexity curve fitting algorithm
- Comparison of two solutions' complexity curves on the same chart

### Example output
```
Two Sum — Brute Force vs HashMap

Step Count
   │                              ● Brute Force O(n²)
   │                         ●
   │                    ●
   │               ●                    ◆ HashMap O(n)
   │          ●             ◆   ◆   ◆   ◆   ◆
   │     ●    ◆   ◆
   │◆◆◆◆
   └────────────────────────────────────── n
      10  50 100 500 1k  5k  10k
```

---

## Running Locally

```bash
# Clone and install
git clone https://github.com/Chauhan-Aman/LogicLens
cd LogicLens
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

See [STARTUP.md](./STARTUP.md) for troubleshooting and detailed setup instructions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Custom CSS |
| Code Editor | Monaco Editor (`@monaco-editor/react`) |
| State Management | Zustand |
| AST Transpiler | `@babel/standalone` (custom plugin) |
| Execution Sandbox | `new Function()` (JS), `g++` subprocess (C++, Phase 6) |
| Version Control | Git + GitHub |

---

## Contributing

To add a new problem:
1. Create `src/data/problems/<problem-id>.json` following the [Problem Schema](#json-problem-schema).
2. Register it in `src/data/index.ts`.
3. Write a pure JavaScript solution in the JSON's `code` field.
4. That's it — the engine handles the rest.

---

*Built with the philosophy: write real code, see real execution.*
