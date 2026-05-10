/**
 * Diacritics-insensitive search utilities for Vietnamese text.
 *
 * Vietnamese users frequently type without tone marks (especially on mobile
 * or when typing quickly). These functions normalize both the search query
 * and the corpus before matching, so "PAN HAI" matches "PAN HẢI AN".
 */

/**
 * Strip Vietnamese diacritics and lowercase a string.
 *
 * Decomposes Unicode characters (NFD), removes combining marks
 * (tone marks, breve, horn, etc.), then lowercases.
 */
export function normalizeVietnamese(str: string): string {
  return str
    .replace(/[đĐ]/g, c => c === 'đ' ? 'd' : 'D')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * Check if `haystack` contains `needle`, ignoring Vietnamese diacritics and case.
 */
export function fuzzyMatch(haystack: string, needle: string): boolean {
  return normalizeVietnamese(haystack).includes(normalizeVietnamese(needle))
}

/**
 * Check if any item in an array contains the needle (diacritics-insensitive).
 */
export function fuzzyMatchAny(haystacks: string[], needle: string): boolean {
  const normalized = normalizeVietnamese(needle)
  return haystacks.some(h => normalizeVietnamese(h).includes(normalized))
}
