// Local-only session history + streak tracking.

export type DhikrSession = {
  id: string;
  dhikrId: string;
  dhikrTransliteration: string;
  count: number;
  target: number | null;
  completed: boolean;
  durationMs: number;
  startedAt: number;
  endedAt: number;
};

const HISTORY_KEY = "dhikr.history";
const SOUND_KEY = "dhikr.sound";
const MAX_SESSIONS = 500;

const isBrowser = () => typeof window !== "undefined";

export function loadSessions(): DhikrSession[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list = raw ? (JSON.parse(raw) as DhikrSession[]) : [];
    return Array.isArray(list) ? list.sort((a, b) => b.endedAt - a.endedAt) : [];
  } catch {
    return [];
  }
}

function writeSessions(list: DhikrSession[]) {
  if (!isBrowser()) return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_SESSIONS)));
}

export function saveSession(session: DhikrSession) {
  writeSessions([session, ...loadSessions()]);
}

export function deleteSession(id: string) {
  writeSessions(loadSessions().filter((s) => s.id !== id));
}

export function clearSessions() {
  if (!isBrowser()) return;
  localStorage.removeItem(HISTORY_KEY);
}

export function soundEnabled(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(SOUND_KEY) !== "0";
}

export function setSoundEnabled(on: boolean) {
  if (!isBrowser()) return;
  localStorage.setItem(SOUND_KEY, on ? "1" : "0");
}

const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const dayNumber = (ts: number) => {
  const d = new Date(ts);
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
};

export type Streaks = { current: number; longest: number };

export function computeStreaks(sessions: DhikrSession[] = loadSessions()): Streaks {
  const days = Array.from(new Set(sessions.map((s) => dayNumber(s.endedAt)))).sort((a, b) => b - a);
  if (!days.length) return { current: 0, longest: 0 };

  const today = dayNumber(Date.now());
  let current = 0;
  if (days[0] === today || days[0] === today - 1) {
    current = 1;
    for (let i = 1; i < days.length; i++) {
      if (days[i - 1] - days[i] === 1) current++;
      else break;
    }
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i - 1] - days[i] === 1) run++;
    else run = 1;
    if (run > longest) longest = run;
  }

  return { current, longest };
}

export function todayTotal(sessions: DhikrSession[] = loadSessions()): number {
  const key = dayKey(Date.now());
  return sessions.filter((s) => dayKey(s.endedAt) === key).reduce((a, s) => a + s.count, 0);
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function humanDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (!m) return `${s} second${s === 1 ? "" : "s"}`;
  return `${m} minute${m === 1 ? "" : "s"} ${s} second${s === 1 ? "" : "s"}`;
}

export function averagePace(count: number, durationMs: number): number {
  const minutes = durationMs / 60000;
  if (minutes <= 0) return 0;
  return Math.round((count / minutes) * 10) / 10;
}

export const TARGET_PRESETS = [33, 99, 100, 1000] as const;

/** Gentle completion feedback: soft chime + light vibration. */
export function playCompletionCue() {
  if (!isBrowser()) return;
  try {
    navigator.vibrate?.([30, 60, 30]);
  } catch {
    /* ignore */
  }
  if (!soundEnabled()) return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [528, 792].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.2);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1800);
  } catch {
    /* ignore */
  }
}
