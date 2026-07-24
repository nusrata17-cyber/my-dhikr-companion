// Normalization + fuzzy matching for dhikr phrase recognition.
// Kept intentionally simple and modular so the recognition provider
// (Web Speech API today, a better engine tomorrow) can be swapped.

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(ARABIC_DIACRITICS, "")
    .replace(TATWEEL, "")
    // unify arabic letter variants
    .replace(/[\u0622\u0623\u0625]/g, "\u0627") // alef variants -> ا
    .replace(/\u0629/g, "\u0647") // ة -> ه
    .replace(/\u0649/g, "\u064a") // ى -> ي
    // strip latin diacritics
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length);
}

/**
 * Best similarity of `phrase` against any of the provided references.
 */
export function bestSimilarity(phrase: string, references: string[]): number {
  let best = 0;
  for (const ref of references) {
    const s = similarity(phrase, ref);
    if (s > best) best = s;
  }
  return best;
}

/**
 * Count how many times a dhikr phrase appears within a longer transcript by
 * scanning word windows. Uses sliding windows sized around the reference length.
 */
export function countOccurrences(
  transcript: string,
  references: string[],
  threshold = 0.62,
): number {
  const words = normalize(transcript).split(" ").filter(Boolean);
  if (!words.length) return 0;
  const refWordCounts = references.map((r) => normalize(r).split(" ").filter(Boolean).length);
  const minLen = Math.max(1, Math.min(...refWordCounts) - 1);
  const maxLen = Math.max(...refWordCounts) + 2;

  let count = 0;
  let i = 0;
  while (i < words.length) {
    let matched = false;
    for (let len = maxLen; len >= minLen; len--) {
      if (i + len > words.length) continue;
      const window = words.slice(i, i + len).join(" ");
      if (bestSimilarity(window, references) >= threshold) {
        count++;
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) i++;
  }
  return count;
}
