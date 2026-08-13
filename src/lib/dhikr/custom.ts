// Local-only storage for user-created custom dhikr (salawat, duas, longer
// recitations). Shape is intentionally compatible with the predefined `Dhikr`
// so every existing screen (counter, calibration, history) works unchanged.

import { DHIKR_LIST, type Dhikr } from "./data";

export type CustomDhikr = Dhikr & {
  /** short label shown in the "My Custom Dhikr" list */
  name: string;
  custom: true;
  createdAt: number;
  updatedAt: number;
};

const KEY = "dhikr.custom.v1";
const isBrowser = () => typeof window !== "undefined";

export const CUSTOM_PREFIX = "custom-";

export function loadCustomDhikr(): CustomDhikr[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as CustomDhikr[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(list: CustomDhikr[]) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getCustomDhikr(id: string): CustomDhikr | undefined {
  return loadCustomDhikr().find((d) => d.id === id);
}

export type CustomDraft = {
  name: string;
  /** the confirmed phrase the recogniser listens for */
  phrase: string;
  arabic?: string;
  transliteration?: string;
  meaning?: string;
};

/** Build canonical reference forms from a draft. */
function canonicalFor(draft: CustomDraft): string[] {
  const forms = [draft.phrase, draft.transliteration, draft.arabic]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  return Array.from(new Set(forms));
}

export function saveCustomDhikr(draft: CustomDraft, existingId?: string): CustomDhikr {
  const list = loadCustomDhikr();
  const now = Date.now();
  const name = draft.name.trim() || "Custom Dhikr";
  const phrase = draft.phrase.trim();
  const entry: CustomDhikr = {
    id: existingId ?? `${CUSTOM_PREFIX}${now.toString(36)}`,
    custom: true,
    name,
    arabic: (draft.arabic ?? "").trim() || phrase,
    transliteration: (draft.transliteration ?? "").trim() || phrase,
    meaning: (draft.meaning ?? "").trim(),
    canonical: canonicalFor({ ...draft, phrase }),
    createdAt: existingId ? (getCustomDhikr(existingId)?.createdAt ?? now) : now,
    updatedAt: now,
  };
  const idx = list.findIndex((d) => d.id === entry.id);
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  persist(list);
  return entry;
}

export function deleteCustomDhikr(id: string) {
  persist(loadCustomDhikr().filter((d) => d.id !== id));
  if (isBrowser()) localStorage.removeItem("dhikr.profile." + id);
}

export function isCustomId(id: string) {
  return id.startsWith(CUSTOM_PREFIX);
}

/** Resolve any dhikr id (predefined or custom). */
export function resolveDhikr(id: string): Dhikr | undefined {
  return DHIKR_LIST.find((d) => d.id === id) ?? getCustomDhikr(id);
}
