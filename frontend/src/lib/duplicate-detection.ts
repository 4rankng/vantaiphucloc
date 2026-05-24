import { normalizeVietnamese } from '@/lib/search-utils'
import type { Location, LocationAlias } from '@/data/domain'

/** Levenshtein edit distance with early-exit for large gaps. */
export function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 99
  const n = b.length
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[n]
}

/** Normalized word tokens, filtering out single-char noise. */
export function getTokens(name: string): string[] {
  return normalizeVietnamese(name).split(/\s+/).filter(t => t.length > 1)
}

/**
 * Returns true if two location names look like potential duplicates.
 *
 * Checks (in order of confidence):
 *  1. Alias cross-check  — A's name is in B's alias list or vice versa
 *  2. Edit distance ≤ 2  — catches typos on strings ≥ 6 chars
 *  3. Token overlap      — ≥ 2 shared significant word tokens (len > 2)
 *  4. Acronym match      — initials of multi-word name equals the other
 */
export function looksLikeDuplicate(
  a: string, b: string,
  aAliases: string[] = [],
  bAliases: string[] = [],
): boolean {
  const normA = normalizeVietnamese(a)
  const normB = normalizeVietnamese(b)
  if (!normA || !normB || normA === normB) return false

  // 1. Alias cross-check
  if (aAliases.some(alias => normalizeVietnamese(alias) === normB)) return true
  if (bAliases.some(alias => normalizeVietnamese(alias) === normA)) return true

  const flatA = normA.replace(/\s+/g, '')
  const flatB = normB.replace(/\s+/g, '')
  if (flatA.length < 3 || flatB.length < 3) return false

  // 2. Edit distance ≤ 2 (only for strings long enough to avoid short false-positives)
  if (Math.min(flatA.length, flatB.length) >= 6 && editDistance(flatA, flatB) <= 2) return true

  // 3. Token overlap: ≥ 2 shared tokens longer than 2 chars
  const tokensA = getTokens(a)
  const tokensB = new Set(getTokens(b).filter(t => t.length > 2))
  const shared = tokensA.filter(t => t.length > 2 && tokensB.has(t)).length
  if (shared >= 2) return true

  // 4. Acronym match: initials of a multi-word name == the other name
  if (tokensA.length >= 2) {
    const initialsA = tokensA.map(w => w[0]).join('')
    if (initialsA.length >= 2 && initialsA === flatB) return true
  }
  if (getTokens(b).length >= 2) {
    const initialsB = getTokens(b).map(w => w[0]).join('')
    if (initialsB.length >= 2 && initialsB === flatA) return true
  }

  return false
}

export function findDuplicateHint(
  loc: Location,
  all: Location[],
  aliasesByLoc: Map<number, LocationAlias[]>,
): Location | null {
  const locAliases = (aliasesByLoc.get(loc.id) ?? []).map(a => a.alias)
  for (const other of all) {
    if (other.id === loc.id) continue
    const otherAliases = (aliasesByLoc.get(other.id) ?? []).map(a => a.alias)
    if (looksLikeDuplicate(loc.name, other.name, locAliases, otherAliases)) return other
  }
  return null
}
