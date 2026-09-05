/**
 * Problem loader — imports all JSON files from /src/data/problems/
 * In Next.js we use require.context or a manual import list.
 * We use a static import approach that Next.js can tree-shake.
 */

import type { Problem } from '@/store/labStore';

import twoSum from './problems/two-sum.json';
import bestTimeToBuySellStock from './problems/best-time-to-buy-sell-stock.json';
import containsDuplicate from './problems/contains-duplicate.json';
import validAnagram from './problems/valid-anagram.json';
import binarySearch from './problems/binary-search.json';
import isomorphicStrings from './problems/isomorphic-strings.json';

export const PROBLEMS: Problem[] = [
  twoSum,
  bestTimeToBuySellStock,
  containsDuplicate,
  validAnagram,
  binarySearch,
  isomorphicStrings,
] as Problem[];
