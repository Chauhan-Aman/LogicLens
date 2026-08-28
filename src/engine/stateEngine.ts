/**
 * Algorithm State Engine
 * Consumes an ExecutionEvent array and builds a StateSnapshot[] timeline.
 * This enables O(1) time-travel to any step.
 */

import type { ExecutionEvent, StateSnapshot, ArrayState, MapState, SetState } from './events';

const RANGE_COLORS = ['violet', 'cyan', 'green', 'orange', 'pink', 'yellow'] as const;

function cloneState(snap: StateSnapshot): StateSnapshot {
  return {
    step: snap.step,
    variables: { ...snap.variables },
    arrays: Object.fromEntries(
      Object.entries(snap.arrays).map(([k, v]) => [
        k,
        {
          ...v,
          values: [...v.values],
          highlights: [],
          activeRanges: v.activeRanges ? [...v.activeRanges] : [],
        },
      ])
    ),
    maps: Object.fromEntries(
      Object.entries(snap.maps).map(([k, v]) => [
        k,
        { entries: [...v.entries] },
      ])
    ),
    sets: Object.fromEntries(
      Object.entries(snap.sets).map(([k, v]) => [
        k,
        { values: [...v.values] },
      ])
    ),
    callStack: [...snap.callStack],
    annotation: '',
    event: snap.event,
    operationCount: snap.operationCount,
    recursiveDepth: snap.recursiveDepth,
    changedVariable: undefined,
  };
}

export function buildTimeline(events: ExecutionEvent[]): StateSnapshot[] {
  const timeline: StateSnapshot[] = [];

  const initialSnap: StateSnapshot = {
    step: 0,
    variables: {},
    arrays: {},
    maps: {},
    sets: {},
    callStack: [],
    annotation: 'Execution started',
    event: { type: 'ANNOTATION', message: 'Start' },
    operationCount: 0,
    recursiveDepth: 0,
    changedVariable: undefined,
  };
  timeline.push(initialSnap);

  let current = cloneState(initialSnap);
  let recursiveDepth = 0;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const next = cloneState(current);
    next.step = i + 1;
    next.event = ev;
    next.operationCount = current.operationCount + 1;
    next.annotation = '';
    next.changedVariable = undefined;

    // Clear all highlights from previous step
    for (const arr of Object.values(next.arrays)) {
      arr.highlights = [];
      arr.writeIndex = undefined;
      arr.swapIndices = undefined;
    }
    for (const m of Object.values(next.maps)) {
      m.highlightKey = undefined;
    }
    for (const s of Object.values(next.sets)) {
      s.highlightValue = undefined;
    }

    switch (ev.type) {
      case 'VARIABLE_UPDATE': {
        if (ev.variable !== undefined) {
          next.variables[ev.variable] = ev.value;
          next.annotation = `${ev.variable} = ${JSON.stringify(ev.value)}`;
          next.changedVariable = ev.variable;

          // If the value is an array, also register it in the arrays visualizer
          if (Array.isArray(ev.value)) {
            next.arrays[ev.variable] = {
              values: [...ev.value as unknown[]],
              highlights: [],
              activeRanges: [],
            };
          }
        }
        break;
      }

      case 'ARRAY_ACCESS': {
        const arrName = ev.array ?? 'arr';
        if (!next.arrays[arrName]) {
          next.arrays[arrName] = { values: [], highlights: [], activeRanges: [] };
        }
        if (ev.index !== undefined) {
          next.arrays[arrName].highlights = [ev.index];
          const val = next.arrays[arrName].values[ev.index];
          next.annotation = `Read ${arrName}[${ev.index}] = ${JSON.stringify(val)}`;
        }
        break;
      }

      case 'ARRAY_WRITE': {
        const arrName = ev.array ?? 'arr';
        if (!next.arrays[arrName]) {
          next.arrays[arrName] = { values: [], highlights: [], activeRanges: [] };
        }
        if (ev.index !== undefined) {
          next.arrays[arrName].values[ev.index] = ev.value;
          next.arrays[arrName].writeIndex = ev.index;
          next.annotation = `Write ${arrName}[${ev.index}] = ${JSON.stringify(ev.value)}`;
        }
        break;
      }

      case 'ARRAY_SWAP': {
        const arrName = ev.array ?? 'arr';
        if (next.arrays[arrName] && ev.index !== undefined && ev.indexB !== undefined) {
          const arr = next.arrays[arrName].values;
          const tmp = arr[ev.index];
          arr[ev.index] = arr[ev.indexB];
          arr[ev.indexB] = tmp;
          next.arrays[arrName].swapIndices = [ev.index, ev.indexB];
          next.arrays[arrName].highlights = [ev.index, ev.indexB];
          next.annotation = `Swap ${arrName}[${ev.index}] ↔ ${arrName}[${ev.indexB}]`;
        }
        break;
      }

      case 'RANGE_HIGHLIGHT': {
        const arrName = ev.array ?? 'arr';
        if (!next.arrays[arrName]) {
          next.arrays[arrName] = { values: [], highlights: [], activeRanges: [] };
        }
        if (ev.rangeStart !== undefined && ev.rangeEnd !== undefined) {
          const depth = ev.depth ?? 0;
          const color = RANGE_COLORS[depth % RANGE_COLORS.length];
          const existing = (next.arrays[arrName].activeRanges ?? []).filter(
            r => !(r.start === ev.rangeStart && r.end === ev.rangeEnd)
          );
          next.arrays[arrName].activeRanges = [
            ...existing,
            { start: ev.rangeStart, end: ev.rangeEnd, depth, label: ev.label, color },
          ];
          next.annotation = ev.label
            ? `${ev.label} [${ev.rangeStart}..${ev.rangeEnd}]`
            : `Range [${ev.rangeStart}..${ev.rangeEnd}]`;
        }
        break;
      }

      case 'ARRAY_SPLIT': {
        const arrName = ev.array ?? 'arr';
        if (!next.arrays[arrName]) {
          next.arrays[arrName] = { values: [], highlights: [], activeRanges: [] };
        }
        if (ev.rangeStart !== undefined && ev.rangeEnd !== undefined) {
          const depth = ev.depth ?? 0;
          const color = RANGE_COLORS[depth % RANGE_COLORS.length];
          next.arrays[arrName].activeRanges = [
            ...(next.arrays[arrName].activeRanges ?? []),
            { start: ev.rangeStart, end: ev.rangeEnd, depth, label: ev.label ?? 'split', color },
          ];
          next.annotation = `Split [${ev.rangeStart}..${ev.rangeEnd}]${ev.label ? ` — ${ev.label}` : ''}`;
        }
        break;
      }

      case 'ARRAY_MERGE': {
        const arrName = ev.array ?? 'arr';
        if (next.arrays[arrName] && ev.rangeStart !== undefined && ev.rangeEnd !== undefined) {
          // Remove sub-ranges and show merged range
          next.arrays[arrName].activeRanges = (next.arrays[arrName].activeRanges ?? []).filter(
            r => !(r.start >= ev.rangeStart! && r.end <= ev.rangeEnd!)
          );
          // Highlight the merged region
          for (let idx = ev.rangeStart; idx <= ev.rangeEnd; idx++) {
            next.arrays[arrName].highlights.push(idx);
          }
          next.annotation = `Merged [${ev.rangeStart}..${ev.rangeEnd}]`;
        }
        break;
      }

      case 'MAP_INSERT': {
        const mapName = ev.map ?? 'map';
        if (!next.maps[mapName]) next.maps[mapName] = { entries: [] };
        const existing = next.maps[mapName].entries.findIndex(
          ([k]) => JSON.stringify(k) === JSON.stringify(ev.key)
        );
        if (existing >= 0) {
          next.maps[mapName].entries[existing] = [ev.key, ev.value];
        } else {
          next.maps[mapName].entries = [...next.maps[mapName].entries, [ev.key, ev.value]];
        }
        next.maps[mapName].highlightKey = ev.key;
        next.annotation = `Map: ${JSON.stringify(ev.key)} → ${JSON.stringify(ev.value)}`;
        break;
      }

      case 'MAP_LOOKUP': {
        const mapName = ev.map ?? 'map';
        if (!next.maps[mapName]) next.maps[mapName] = { entries: [] };
        next.maps[mapName].highlightKey = ev.key;
        next.annotation = `Map lookup: ${JSON.stringify(ev.key)} → ${JSON.stringify(ev.value ?? 'not found')}`;
        break;
      }

      case 'MAP_DELETE': {
        const mapName = ev.map ?? 'map';
        if (next.maps[mapName]) {
          next.maps[mapName].entries = next.maps[mapName].entries.filter(
            ([k]) => JSON.stringify(k) !== JSON.stringify(ev.key)
          );
          next.annotation = `Map delete: ${JSON.stringify(ev.key)}`;
        }
        break;
      }

      case 'SET_INSERT': {
        const setName = ev.set ?? 'set';
        if (!next.sets[setName]) next.sets[setName] = { values: [] };
        if (!next.sets[setName].values.some(v => JSON.stringify(v) === JSON.stringify(ev.value))) {
          next.sets[setName].values = [...next.sets[setName].values, ev.value];
        }
        next.sets[setName].highlightValue = ev.value;
        next.annotation = `Set insert: ${JSON.stringify(ev.value)}`;
        break;
      }

      case 'SET_LOOKUP': {
        const setName = ev.set ?? 'set';
        if (!next.sets[setName]) next.sets[setName] = { values: [] };
        next.sets[setName].highlightValue = ev.value;
        next.annotation = `Set lookup: ${JSON.stringify(ev.value)} → ${ev.result}`;
        break;
      }

      case 'COMPARISON': {
        next.annotation = `Compare: ${JSON.stringify(ev.left)} vs ${JSON.stringify(ev.right)} → ${ev.result ? '✓ true' : '✗ false'}`;
        break;
      }

      case 'FUNCTION_ENTER':
      case 'RECURSIVE_CALL': {
        recursiveDepth++;
        next.recursiveDepth = recursiveDepth;
        next.callStack = [
          ...next.callStack,
          { name: ev.fn ?? '?', args: ev.args ?? [], depth: recursiveDepth },
        ];
        next.annotation = `▶ ${ev.fn}(${(ev.args ?? []).map(a => JSON.stringify(a)).join(', ')})`;
        break;
      }

      case 'FUNCTION_EXIT':
      case 'RECURSIVE_RETURN': {
        recursiveDepth = Math.max(0, recursiveDepth - 1);
        next.recursiveDepth = recursiveDepth;
        next.callStack = next.callStack.slice(0, -1);
        next.annotation = ev.returnValue !== undefined
          ? `◀ return ${JSON.stringify(ev.returnValue)}`
          : '◀ return';
        break;
      }

      case 'ANNOTATION': {
        next.annotation = ev.message ?? '';
        break;
      }

      case 'LOOP_ITERATION': {
        next.annotation = ev.message ?? 'Loop iteration';
        break;
      }
    }

    next.recursiveDepth = recursiveDepth;
    timeline.push(next);
    current = next;
  }

  return timeline;
}
