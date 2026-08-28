import { executeCode } from './executor';
import { buildTimeline } from './stateEngine';
import type { StateSnapshot } from './events';

export interface TestResult {
  input: Record<string, unknown>;
  expected: unknown;
  actual: unknown;
  passed: boolean;
  events: any[]; // The raw events from execution
  timeline: StateSnapshot[]; // Built timeline for debugging
  error: string | null;
  durationMs: number;
}

/**
 * Deep compare actual vs expected.
 * If exactOrder is false and both are arrays, compares elements regardless of order.
 */
function compareResults(actual: unknown, expected: unknown, exactOrder = true): boolean {
  if (actual === expected) return true;

  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    
    if (!exactOrder) {
      // Sort copies for order-independent comparison
      const sortedActual = [...actual].sort();
      const sortedExpected = [...expected].sort();
      return sortedActual.every((val, index) => compareResults(val, sortedExpected[index], true));
    }

    return actual.every((val, index) => compareResults(val, expected[index], exactOrder));
  }

  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const actKeys = Object.keys(actual as Record<string, unknown>);
    const expKeys = Object.keys(expected as Record<string, unknown>);
    if (actKeys.length !== expKeys.length) return false;
    return actKeys.every(k => compareResults((actual as any)[k], (expected as any)[k], exactOrder));
  }

  return false;
}

export async function runAllTests(
  code: string,
  testCases: { input: Record<string, unknown>; expected: unknown; exactOrder?: boolean }[],
  language: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const tc of testCases) {
    const start = performance.now();
    
    try {
      const inputStr = JSON.stringify(tc.input);
      const res = await executeCode(code, inputStr, language);
      const durationMs = performance.now() - start;

      if (res.error) {
        results.push({
          input: tc.input,
          expected: tc.expected,
          actual: null,
          passed: false,
          events: [],
          timeline: [],
          error: res.error,
          durationMs,
        });
        continue;
      }

      // Check if passed
      const exactOrder = tc.exactOrder ?? true;
      const passed = compareResults(res.returnValue, tc.expected, exactOrder);

      const timeline = buildTimeline(res.events);

      results.push({
        input: tc.input,
        expected: tc.expected,
        actual: res.returnValue,
        passed,
        events: res.events,
        timeline,
        error: null,
        durationMs,
      });

    } catch (e) {
      results.push({
        input: tc.input,
        expected: tc.expected,
        actual: null,
        passed: false,
        events: [],
        timeline: [],
        error: e instanceof Error ? e.message : String(e),
        durationMs: performance.now() - start,
      });
    }
  }

  return results;
}
