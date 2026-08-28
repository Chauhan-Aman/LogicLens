/**
 * Problem Understanding / Structure Detector
 * Statically analyzes user code to determine which data structures are used,
 * and selects which renderers to activate.
 */

export type StructureType = 'array' | 'hashmap' | 'set' | 'stack' | 'queue' | 'tree' | 'graph' | 'heap' | 'dp';

export interface DetectionResult {
  structures: StructureType[];
  usesRecursion: boolean;
  estimatedComplexity: string;
}

export function detectStructures(code: string): DetectionResult {
  const structures: StructureType[] = [];
  const lower = code.toLowerCase();

  // Array
  if (
    lower.includes('__ll.array') ||
    lower.includes('arr[') ||
    lower.includes('nums[') ||
    lower.includes('.push(') ||
    lower.includes('.pop(') ||
    lower.includes('for') && lower.includes('[i]')
  ) {
    if (!structures.includes('array')) structures.push('array');
  }

  // HashMap
  if (
    lower.includes('__ll.map') ||
    lower.includes('map.set(') ||
    lower.includes('map.get(') ||
    lower.includes('map.has(') ||
    lower.includes('hashmap') ||
    lower.includes('new map')
  ) {
    if (!structures.includes('hashmap')) structures.push('hashmap');
  }

  // Set
  if (
    lower.includes('__ll.set') ||
    lower.includes('set.add(') ||
    lower.includes('set.has(') ||
    lower.includes('new set')
  ) {
    if (!structures.includes('set')) structures.push('set');
    if (!structures.includes('hashmap')) structures.push('hashmap'); // render sets in hashmap panel
  }

  // Stack (using push/pop)
  if (
    (lower.includes('.push(') && lower.includes('.pop(')) ||
    lower.includes('stack')
  ) {
    if (!structures.includes('stack')) structures.push('stack');
    if (!structures.includes('array')) structures.push('array');
  }

  // Queue
  if (
    lower.includes('queue') ||
    lower.includes('.shift(') ||
    lower.includes('deque')
  ) {
    if (!structures.includes('queue')) structures.push('queue');
  }

  // Recursion
  const usesRecursion = /function\s+(\w+)[^{]*\{[^}]*\1\s*\(/.test(code);

  // Simple complexity heuristic
  const loopCount = (code.match(/\bfor\b|\bwhile\b/g) ?? []).length;
  let estimatedComplexity = 'O(1)';
  if (loopCount === 1) estimatedComplexity = 'O(n)';
  if (loopCount === 2) estimatedComplexity = 'O(n²)';
  if (loopCount >= 3) estimatedComplexity = 'O(n³)';
  if (usesRecursion) estimatedComplexity += ' (recursive)';

  return { structures, usesRecursion, estimatedComplexity };
}
