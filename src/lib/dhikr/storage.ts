// Local-only voice profile storage. Nothing is sent anywhere.
// Structure is intentionally forward-compatible so future dhikr can plug in.

export type VoiceSample = {
  transcript: string;
  durationMs: number;
  capturedAt: number;
};

export type VoiceProfile = {
  dhikrId: string;
  version: number;
  samples: VoiceSample[];
  updatedAt: number;
};

export type FeedbackKind = "correct" | "missed" | "wrong";
export type FeedbackEntry = {
  dhikrId: string;
  kind: FeedbackKind;
  at: number;
};

const PROFILE_PREFIX = "dhikr.profile.";
const FEEDBACK_KEY = "dhikr.feedback";

const isBrowser = () => typeof window !== "undefined";

export function loadProfile(dhikrId: string): VoiceProfile | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(PROFILE_PREFIX + dhikrId);
    return raw ? (JSON.parse(raw) as VoiceProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: VoiceProfile) {
  if (!isBrowser()) return;
  localStorage.setItem(PROFILE_PREFIX + profile.dhikrId, JSON.stringify(profile));
}

export function deleteProfile(dhikrId: string) {
  if (!isBrowser()) return;
  localStorage.removeItem(PROFILE_PREFIX + dhikrId);
}

export function deleteAllProfiles() {
  if (!isBrowser()) return;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(PROFILE_PREFIX)) localStorage.removeItem(key);
  }
}

export function recordFeedback(entry: FeedbackEntry) {
  if (!isBrowser()) return;
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    const list: FeedbackEntry[] = raw ? JSON.parse(raw) : [];
    list.push(entry);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(list.slice(-200)));
  } catch {
    // ignore
  }
}
