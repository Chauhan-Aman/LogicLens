// ─── Algorithm Pattern Types ──────────────────────────────────────────────────

export type AlgoPattern =
  | 'two-pointer'
  | 'sliding-window'
  | 'divide-conquer'
  | 'sorting'
  | 'hashmap-lookup'
  | 'dp'
  | 'generic';

// ─── Execution Event Types ───────────────────────────────────────────────────

export type EventType =
  | 'VARIABLE_UPDATE'
  | 'ARRAY_ACCESS'
  | 'ARRAY_WRITE'
  | 'ARRAY_SWAP'
  | 'MAP_INSERT'
  | 'MAP_LOOKUP'
  | 'MAP_DELETE'
  | 'SET_INSERT'
  | 'SET_LOOKUP'
  | 'COMPARISON'
  | 'FUNCTION_ENTER'
  | 'FUNCTION_EXIT'
  | 'LOOP_ITERATION'
  | 'PUSH'
  | 'POP'
  | 'HIGHLIGHT'
  | 'ANNOTATION'
  | 'RANGE_HIGHLIGHT'
  | 'ARRAY_SPLIT'
  | 'ARRAY_MERGE'
  | 'RECURSIVE_CALL'
  | 'RECURSIVE_RETURN'
  | 'BLOCK_ENTER'
  | 'BLOCK_EXIT';

export interface ExecutionEvent {
  type: EventType;
  // Block events
  blockType?: string; // 'for', 'while', 'if'
  blockLabel?: string;
  // Variable events
  variable?: string;
  value?: unknown;
  // Array events
  array?: string;
  index?: number;
  indexB?: number; // for swap
  // Range / recursive events
  rangeStart?: number;
  rangeEnd?: number;
  depth?: number;   // recursive call depth
  label?: string;   // e.g. "left half", "merging", "sorted"
  // Map / Set events
  map?: string;
  set?: string;
  key?: unknown;
  // Comparison events
  left?: unknown;
  right?: unknown;
  result?: boolean;
  // Function events
  fn?: string;
  args?: unknown[];
  returnValue?: unknown;
  // Annotation
  message?: string;
  // Source location (line in user code)
  line?: number;
}

// ─── State Snapshot ──────────────────────────────────────────────────────────

export interface ActiveRange {
  start: number;
  end: number;
  depth: number;
  label?: string;
  color?: 'violet' | 'cyan' | 'green' | 'orange' | 'pink' | 'yellow';
}

export interface ArrayState {
  values: unknown[];
  highlights: number[];      // indices highlighted this step
  writeIndex?: number;       // index being written
  swapIndices?: [number, number];
  activeRanges?: ActiveRange[];
}

export interface MapState {
  entries: [unknown, unknown][];
  highlightKey?: unknown;
}

export interface SetState {
  values: unknown[];
  highlightValue?: unknown;
}

export interface FunctionFrame {
  name: string;
  args: unknown[];
  depth: number;
}

export interface StateSnapshot {
  step: number;
  variables: Record<string, unknown>;
  arrays: Record<string, ArrayState>;
  maps: Record<string, MapState>;
  sets: Record<string, SetState>;
  callStack: FunctionFrame[];
  annotation: string;
  event: ExecutionEvent;
  operationCount: number;
  // Universal visualization fields
  recursiveDepth: number;
  changedVariable?: string; // which variable changed this step (for flash animation)
}
