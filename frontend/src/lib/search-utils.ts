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
 * Check if `haystack` contains `needle`, ignoring Vietnamese diacritics, case, and spaces.
 */
export function fuzzyMatch(haystack: string, needle: string): boolean {
  const h = normalizeVietnamese(haystack).replace(/\s+/g, '')
  const n = normalizeVietnamese(needle).replace(/\s+/g, '')
  return h.includes(n)
}
