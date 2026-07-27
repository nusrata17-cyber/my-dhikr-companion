// Strict dhikr phrase matcher.
//
// Design goals:
// - Only *transcribed words* decide a match (never audio energy / voice timbre).
// - Calibration samples only widen the set of accepted *transcripts* for the
//   same phrase; they can never make an unrelated phrase count.
// - One spoken repetition => exactly one count (final results only, greedy
//   non-overlapping window scan).

import { normalize } from "./normalize";

export type MatchReason =
  | "match"
  | "empty"
  | "too-short"
  | "no-phrase-found"
  | "low-similarity"
  | "duplicate";

export type MatchResult = {
  /** number of complete repetitions found in this transcript */
  count: number;
  accepted: boolean;
  reason: MatchReason;
  /** best similarity observed (0..1), for debugging */
  bestScore: number;
  normalized: string;
};

const ARABIC_RE = /[\u0600-\u06FF]/;

/** Consonant skeleton: robust to transliteration/vowel spelling differences. */
export function skeleton(input: string): string {
  const n = normalize(input);
  if (!n) return "";
  const isArabic = ARABIC_RE.test(n);
  let s = n.replace(/\s+/g, "");
  if (isArabic) {
    // drop long vowels / hamza carriers that ASR spells inconsistently
    s = s.replace(/[\u0627\u0648\u064a\u0621]/g, "");
  } else {
    s = s.replace(/[aeiouy']/g, "");
  }
  // collapse repeated letters (illallah / ilallah)
  s = s.replace(/(.)\1+/g, "$1");
  return s;
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

function ratio(a: string, b: string): number {
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

export type PreparedRef = {
  skeleton: string;
  words: number;
  arabic: boolean;
};

export function prepareReferences(refs: string[]): PreparedRef[] {
  const out: PreparedRef[] = [];
  const seen = new Set<string>();
  for (const r of refs) {
    const sk = skeleton(r);
    if (sk.length < 5) continue;
    if (seen.has(sk)) continue;
    seen.add(sk);
    out.push({
      skeleton: sk,
      words: normalize(r).split(" ").filter(Boolean).length,
      arabic: ARABIC_RE.test(normalize(r)),
    });
  }
  return out;
}

/** Similarity of an arbitrary phrase against prepared references. */
export function scoreAgainst(phrase: string, refs: PreparedRef[]): number {
  const sk = skeleton(phrase);
  if (!sk) return 0;
  const arabic = ARABIC_RE.test(normalize(phrase));
  let best = 0;
  for (const ref of refs) {
    if (ref.arabic !== arabic) continue;
    // length sanity: a fragment or a much longer phrase is not this dhikr
    const lenRatio = Math.min(sk.length, ref.skeleton.length) / Math.max(sk.length, ref.skeleton.length);
    if (lenRatio < 0.62) continue;
    const s = ratio(sk, ref.skeleton);
    if (s > best) best = s;
  }
  return best;
}

export const MATCH_THRESHOLD = 0.84;

/**
 * Count complete, non-overlapping repetitions of the dhikr inside a FINAL
 * transcript. Never call this with interim results.
 */
export function matchTranscript(
  transcript: string,
  refs: PreparedRef[],
  threshold = MATCH_THRESHOLD,
): MatchResult {
  const n = normalize(transcript);
  if (!n) return { count: 0, accepted: false, reason: "empty", bestScore: 0, normalized: n };
  const words = n.split(" ").filter(Boolean);
  if (!refs.length) {
    return { count: 0, accepted: false, reason: "no-phrase-found", bestScore: 0, normalized: n };
  }
  if (skeleton(n).length < 4) {
    return { count: 0, accepted: false, reason: "too-short", bestScore: 0, normalized: n };
  }

  const refWords = refs.map((r) => r.words);
  const minLen = Math.max(1, Math.min(...refWords) - 1);
  const maxLen = Math.max(...refWords) + 1;

  let count = 0;
  let best = 0;
  let i = 0;
  while (i < words.length) {
    let matchedLen = 0;
    let matchedScore = 0;
    for (let len = maxLen; len >= minLen; len--) {
      if (i + len > words.length) continue;
      const window = words.slice(i, i + len).join(" ");
      const s = scoreAgainst(window, refs);
      if (s > best) best = s;
      if (s >= threshold && s > matchedScore) {
        matchedScore = s;
        matchedLen = len;
      }
    }
    if (matchedLen) {
      count++;
      i += matchedLen;
    } else {
      i++;
    }
  }

  if (count === 0) {
    return {
      count: 0,
      accepted: false,
      reason: best > 0 ? "low-similarity" : "no-phrase-found",
      bestScore: best,
      normalized: n,
    };
  }
  return { count, accepted: true, reason: "match", bestScore: best, normalized: n };
}

export function describeReason(r: MatchReason): string {
  switch (r) {
    case "match":
      return "Accepted";
    case "empty":
      return "Rejected — nothing transcribed (silence / noise)";
    case "too-short":
      return "Rejected — too short / partial word";
    case "low-similarity":
      return "Rejected — heard words are not the selected dhikr";
    case "duplicate":
      return "Rejected — same utterance already counted";
    default:
      return "Rejected — dhikr phrase not found";
  }
}
