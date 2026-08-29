/**
 * Code Execution Engine
 *
 * This runs user JavaScript code inside a controlled sandbox.
 * The sandbox injects a proxy API (`__ll`) that the user code can call,
 * or the engine instruments the code's AST automatically.
 *
 * Strategy: We provide a proxy object `__ll` to the user code which intercepts
 * all array/map/set operations, comparison calls, etc. and emits events.
 * Users write normal JS — the proxy wraps their data structures transparently.
 */

import type { ExecutionEvent } from './events';
import { transpileCode } from './astTranspiler';


const MAX_STEPS = 10000; // safety guard

/**
 * Creates a proxy Array that emits events on every access/write/swap.
 */
function createTrackedArray(
  initial: unknown[],
  name: string,
  emit: (e: ExecutionEvent) => void
): unknown[] {
  const arr = [...initial];

  return new Proxy(arr, {
    get(target, prop) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        const idx = parseInt(prop, 10);
        emit({ type: 'ARRAY_ACCESS', array: name, index: idx });
        return target[idx];
      }
      // Intercept push/pop methods
      if (prop === 'push') {
        return (...args: unknown[]) => {
          const result = target.push(...args);
          args.forEach((v, i) => {
            emit({ type: 'PUSH', array: name, value: v, index: target.length - args.length + i });
            emit({ type: 'ARRAY_WRITE', array: name, value: v, index: target.length - args.length + i });
          });
          return result;
        };
      }
      if (prop === 'pop') {
        return () => {
          const v = target.pop();
          emit({ type: 'POP', array: name, value: v });
          return v;
        };
      }
      if (prop === 'length') return target.length;
      const val = (target as unknown as Record<string | symbol, unknown>)[prop];
      if (typeof val === 'function') return val.bind(target);
      return val;
    },
    set(target, prop, value) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        const idx = parseInt(prop, 10);
        emit({ type: 'ARRAY_WRITE', array: name, value, index: idx });
        target[idx] = value;
        return true;
      }
      (target as unknown as Record<string | symbol, unknown>)[prop] = value;
      return true;
    },
  });
}

/**
 * Creates a tracked Map that emits events on set/get/delete.
 */
function createTrackedMap(
  name: string,
  emit: (e: ExecutionEvent) => void
): Map<unknown, unknown> {
  const inner = new Map<unknown, unknown>();

  return new Proxy(inner, {
    get(_target, prop) {
      if (prop === 'set') {
        return (k: unknown, v: unknown) => {
          inner.set(k, v);
          emit({ type: 'MAP_INSERT', map: name, key: k, value: v });
          return inner;
        };
      }
      if (prop === 'get') {
        return (k: unknown) => {
          const v = inner.get(k);
          emit({ type: 'MAP_LOOKUP', map: name, key: k, value: v });
          return v;
        };
      }
      if (prop === 'has') {
        return (k: unknown) => {
          const result = inner.has(k);
          emit({ type: 'MAP_LOOKUP', map: name, key: k, value: result });
          return result;
        };
      }
      if (prop === 'delete') {
        return (k: unknown) => {
          const result = inner.delete(k);
          emit({ type: 'MAP_DELETE', map: name, key: k });
          return result;
        };
      }
      if (prop === 'size') return inner.size;
      if (prop === 'forEach') return inner.forEach.bind(inner);
      if (prop === 'entries') return inner.entries.bind(inner);
      if (prop === 'keys') return inner.keys.bind(inner);
      if (prop === 'values') return inner.values.bind(inner);
      if (prop === Symbol.iterator) return inner[Symbol.iterator].bind(inner);
      return (inner as unknown as Record<string | symbol, unknown>)[prop];
    },
  }) as Map<unknown, unknown>;
}

/**
 * Creates a tracked Set that emits events on add/has.
 */
function createTrackedSet(
  name: string,
  emit: (e: ExecutionEvent) => void
): Set<unknown> {
  const inner = new Set<unknown>();

  return new Proxy(inner, {
    get(_target, prop) {
      if (prop === 'add') {
        return (v: unknown) => {
          inner.add(v);
          emit({ type: 'SET_INSERT', set: name, value: v });
          return inner;
        };
      }
      if (prop === 'has') {
        return (v: unknown) => {
          const result = inner.has(v);
          emit({ type: 'SET_LOOKUP', set: name, value: v, result });
          return result;
        };
      }
      if (prop === 'size') return inner.size;
      if (prop === 'forEach') return inner.forEach.bind(inner);
      if (prop === Symbol.iterator) return inner[Symbol.iterator].bind(inner);
      return (inner as unknown as Record<string | symbol, unknown>)[prop];
    },
  }) as Set<unknown>;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ExecutionResult {
  events: ExecutionEvent[];
  returnValue: unknown;
  error?: string;
  stepCount: number;
}

/**
 * Execute user code in a controlled sandbox and collect events.
 * Executes the user's code inside a sandboxed environment, or sends it to the API for C++.
 * @param userCode The raw code from the editor
 * @param inputJson The raw JSON string from the input panel
 * @param language The programming language ('javascript' or 'cpp')
 */
export async function executeCode(userCode: string, inputJson: string, language: string = 'javascript'): Promise<ExecutionResult> {
  const events: ExecutionEvent[] = [];
  let stepCount = 0;
  const emit = (e: ExecutionEvent) => {
    if (events.length < MAX_STEPS) {
      events.push(e);
      stepCount++;
    }
  };

  if (language === 'cpp') {
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: userCode, input: inputJson, language: 'cpp' }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return { events: [], error: data.error || 'Execution failed', returnValue: undefined, stepCount: 0 };
      }

      const receivedEvents = data.events || [];
      return { events: receivedEvents, error: undefined, returnValue: undefined, stepCount: receivedEvents.length };
    } catch (e: any) {
      return { events: [], error: e.message, returnValue: undefined, stepCount: 0 };
    }
  }

  let input: any;
  try {
    input = JSON.parse(inputJson);
  } catch (err) {
    return { events: [], error: 'Invalid input JSON', returnValue: undefined, stepCount: 0 };
  }

  // Pre-process the input object into Proxies so that pure standard accesses (e.g. nums[i]) are tracked automatically
  const proxiedInput: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      proxiedInput[key] = createTrackedArray(value, key, emit);
      // Populate the initial array state in the timeline
      value.forEach((v, i) => {
        emit({ type: 'ARRAY_WRITE', array: key, value: v, index: i });
      });
    } else {
      proxiedInput[key] = value;
      // Populate the initial variable state in the timeline
      emit({ type: 'VARIABLE_UPDATE', variable: key, value });
    }
  }

  // Transpile pure JavaScript into instrumented tracking code
  const instrumentedCode = transpileCode(userCode);

  const llApi = {
    array: (name: string, initial: unknown[]) => createTrackedArray(initial, name, emit),
    map: (name: string, initialMap?: Map<unknown, unknown>) => createTrackedMap(initialMap ? name : name, emit),
    set: (name: string, initialSet?: Set<unknown>) => createTrackedSet(initialSet ? name : name, emit),
    setVar: (name: string, value: unknown) => {
      emit({ type: 'VARIABLE_UPDATE', variable: name, value });
      return value;
    },
    compare: (a: unknown, b: unknown, result: boolean) => {
      emit({ type: 'COMPARISON', left: a, right: b, result });
      return result;
    },
    note: (...args: unknown[]) => emit({ type: 'ANNOTATION', message: args.map(a => String(a)).join(' ') }),
    swap: (arr: unknown[], i: number, j: number, name = 'arr') => {
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
      emit({ type: 'ARRAY_SWAP', array: name, index: i, indexB: j });
    },
    funcEnter: (name: string, args: unknown[]) => {
      emit({ type: 'FUNCTION_ENTER', fn: name, args });
    },
    funcExit: (returnValue: unknown) => {
      emit({ type: 'FUNCTION_EXIT', returnValue });
    },
    range: (arrayName: string, start: number, end: number, label?: string, depth?: number) => {
      emit({ type: 'RANGE_HIGHLIGHT', array: arrayName, rangeStart: start, rangeEnd: end, label, depth });
    },
    split: (arrayName: string, start: number, end: number, label?: string, depth?: number) => {
      emit({ type: 'ARRAY_SPLIT', array: arrayName, rangeStart: start, rangeEnd: end, label, depth });
    },
    merge: (arrayName: string, start: number, end: number) => {
      emit({ type: 'ARRAY_MERGE', array: arrayName, rangeStart: start, rangeEnd: end });
    },
    blockEnter: (type: string, label?: string) => {
      emit({ type: 'BLOCK_ENTER', blockType: type, blockLabel: label });
    },
    blockExit: () => {
      emit({ type: 'BLOCK_EXIT' });
    }
  };

  let returnValue: unknown;
  let error: string | undefined;

  try {
    // Build the sandbox function
    // We inject __ll (our tracker API) and __input (the raw input object).
    // The user's code uses `const s = __input.s;`, so we must not pass `s` as a parameter to avoid SyntaxError.
    const paramNames = ['__ll', '__input'];
    const paramValues = [llApi, proxiedInput];

    const sandboxFn = new Function(
      ...paramNames,
      `
"use strict";
${instrumentedCode}
`
    );

    returnValue = sandboxFn(...paramValues);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return { events, returnValue, error, stepCount };
}
