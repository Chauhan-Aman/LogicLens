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
 * Executes the user's code inside a sandboxed environment.
 * @param userCode The raw code from the editor
 * @param inputJson The raw JSON string from the input panel
 */
export function executeCode(userCode: string, inputJson: string): ExecutionResult {
  const events: ExecutionEvent[] = [];
  let stepCount = 0;
  const emit = (e: ExecutionEvent) => {
    if (events.length < MAX_STEPS) {
      events.push(e);
      stepCount++;
    }
  };

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
    } else {
      proxiedInput[key] = value;
    }
  }

  // Transpile pure JavaScript into instrumented tracking code
  const instrumentedCode = transpileCode(userCode);

  const llApi = {
    array: (name: string, initial: unknown[]) => createTrackedArray(initial, name, emit),
    map: (name: string, initialMap?: Map<unknown, unknown>) => createTrackedMap(initialMap ? name : name, emit), // Fallback map tracking for now
    set: (name: string, initialSet?: Set<unknown>) => createTrackedSet(initialSet ? name : name, emit),
    setVar: (name: string, value: unknown) => {
      emit({ type: 'VARIABLE_UPDATE', variable: name, value });
      return value;
    },
    compare: (a: unknown, b: unknown, result: boolean) => {
      emit({ type: 'COMPARISON', left: a, right: b, result });
      return result;
    },
    note: (msg: string) => emit({ type: 'ANNOTATION', message: msg }),
    swap: (arr: unknown[], i: number, j: number, name = 'arr') => {
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
      emit({ type: 'ARRAY_SWAP', array: name, index: i, indexB: j });
    },
  };

  let returnValue: unknown;
  let error: string | undefined;

  try {
    // Build the sandbox function
    // We inject __ll (our tracker API), __input (the raw input object), and destructure the proxied inputs directly into the scope.
    const paramNames = ['__ll', '__input', ...Object.keys(proxiedInput)];
    const paramValues = [llApi, input, ...Object.values(proxiedInput)];

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
