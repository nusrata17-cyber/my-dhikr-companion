import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DHIKR_LIST, getDhikr, type Dhikr } from "@/lib/dhikr/data";
import { loadCustomDhikr, type CustomDhikr } from "@/lib/dhikr/custom";
import { loadProfile } from "@/lib/dhikr/storage";
import { normalize } from "@/lib/dhikr/normalize";
import {
  describeReason,
  matchTranscript,
  prepareReferences,
  scoreAgainst,
  isLongPhrase,
  thresholdFor,
} from "@/lib/dhikr/matcher";
import {
  TARGET_PRESETS,
  averagePace,
  computeStreaks,
  formatDuration,
  humanDuration,
  playCompletionCue,
  saveSession,
  setSoundEnabled,
  soundEnabled,
  type DhikrSession,
} from "@/lib/dhikr/session";
import {
  isSpeechRecognitionSupported,
  useSpeechRecognition,
} from "@/lib/dhikr/useSpeechRecognition";
import {
  AlertCircle,
  Flame,
  History,
  Mic,
  MicOff,
  Minus,
  Plus,
  Sparkles,
  RotateCcw,
  Settings as SettingsIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dhikr Companion — Voice-powered remembrance" },
      {
        name: "description",
        content:
          "A peaceful, private voice dhikr counter with targets, session history and daily streaks. Recite and let the app count each repetition.",
      },
      { property: "og:title", content: "Dhikr Companion" },
      {
        property: "og:description",
        content: "Voice dhikr counter with targets, session timer, history and streaks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

/** Spacing between visual increments when several repetitions arrive together. */
const DRIP_MS = 260;

function Home() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (typeof window === "undefined") return DHIKR_LIST[0].id;
    return localStorage.getItem("dhikr.selected") ?? DHIKR_LIST[0].id;
  });
  const [count, setCount] = useState(0);
  const [interim, setInterim] = useState("");
  const [lastMatchAt, setLastMatchAt] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const [target, setTarget] = useState<number | null>(33);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const [celebrating, setCelebrating] = useState(false);
  const [summary, setSummary] = useState<DhikrSession | null>(null);
  const [sound, setSound] = useState(true);
  const [streaks, setStreaks] = useState({ current: 0, longest: 0 });

  // Custom dhikr live in localStorage — load after hydration.
  const [customList, setCustomList] = useState<CustomDhikr[]>([]);
  useEffect(() => setCustomList(loadCustomDhikr()), []);
  const selected: Dhikr =
    getDhikr(selectedId) ?? customList.find((d) => d.id === selectedId) ?? DHIKR_LIST[0];
  // Profiles live in localStorage, which does not exist during SSR — load them
  // after hydration (and whenever the dhikr changes) instead of memoising null.
  const [profile, setProfile] = useState<ReturnType<typeof loadProfile>>(null);
  useEffect(() => {
    setProfile(loadProfile(selected.id));
  }, [selected.id]);
  const calibrated = !!profile && profile.samples.length >= 5;


  const [debugMode, setDebugMode] = useState(false);
  type DebugEntry = { at: number; text: string; ok: boolean; reason: string; score: number };
  const [debugLog, setDebugLog] = useState<DebugEntry[]>([]);

  useEffect(() => {
    setDebugMode(localStorage.getItem("dhikr.debug") === "1");
    setSupported(isSpeechRecognitionSupported());
    setSound(soundEnabled());
    setStreaks(computeStreaks());
  }, []);

  useEffect(() => {
    localStorage.setItem("dhikr.selected", selectedId);
  }, [selectedId]);

  // ---------------- session timer ----------------
  useEffect(() => {
    if (!timerRunning || startedAt === null) return;
    setElapsed(Date.now() - startedAt);
    const id = window.setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, startedAt]);

  const beginSession = useCallback(() => {
    setStartedAt((s) => s ?? Date.now());
    setTimerRunning(true);
  }, []);

  // ---------------- incremental (real-time) counting ----------------
  // Recognised repetitions are queued and applied ONE at a time so the display
  // walks 0 → 1 → 2 → 3 instead of jumping straight to 3.
  const queueRef = useRef(0);
  const drainRef = useRef<number | null>(null);

  const applyOne = useCallback(() => {
    setCount((c) => c + 1);
    setLastMatchAt(Date.now());
    beginSession();
  }, [beginSession]);

  const drain = useCallback(() => {
    if (queueRef.current <= 0) {
      drainRef.current = null;
      return;
    }
    queueRef.current -= 1;
    applyOne();
    drainRef.current = window.setTimeout(drain, DRIP_MS);
  }, [applyOne]);

  const enqueue = useCallback(
    (n: number) => {
      queueRef.current += n;
      if (drainRef.current === null) drain();
    },
    [drain],
  );

  useEffect(
    () => () => {
      if (drainRef.current !== null) window.clearTimeout(drainRef.current);
    },
    [],
  );

  // ---------------- recognition ----------------
  const references = useMemo(() => {
    const canonical = prepareReferences(selected.canonical);
    const samples = (profile?.samples ?? [])
      .map((s) => s.transcript)
      .filter((t) => scoreAgainst(t, canonical) >= 0.7);
    return prepareReferences([...selected.canonical, ...samples]);
  }, [selected, profile]);

  const threshold = useMemo(() => thresholdFor(references), [references]);
  const longPhrase = useMemo(() => isLongPhrase(references), [references]);

  const lastTranscriptRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  // Long recitations often arrive as several final results; join them so one
  // complete recitation counts exactly once (and partials count zero).
  const bufferRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });

  const handleFinal = useCallback(
    ({ transcript, at }: { transcript: string; at: number }) => {
      setInterim("");
      const norm = normalize(transcript);
      // Cooldown / duplicate guard: engines can re-emit the same final utterance.
      if (
        norm &&
        norm === lastTranscriptRef.current.text &&
        at - lastTranscriptRef.current.at < 1500
      ) {
        setDebugLog((l) =>
          [
            { at, text: transcript, ok: false, reason: describeReason("duplicate"), score: 1 },
            ...l,
          ].slice(0, 12),
        );
        return;
      }
      lastTranscriptRef.current = { text: norm, at };

      let subject = transcript;
      if (longPhrase) {
        const fresh = at - bufferRef.current.at < 25000 ? bufferRef.current.text : "";
        subject = (fresh + " " + transcript).trim();
        bufferRef.current = { text: subject, at };
      }

      const result = matchTranscript(subject, references, threshold);
      if (longPhrase && result.accepted) bufferRef.current = { text: "", at };
      setDebugLog((l) =>
        [
          {
            at,
            text: subject,
            ok: result.accepted,
            reason: result.accepted ? `Accepted ×${result.count}` : describeReason(result.reason),
            score: result.bestScore,
          },
          ...l,
        ].slice(0, 12),
      );
      if (!result.accepted) return;
      enqueue(result.count);
    },
    [references, enqueue, threshold, longPhrase],
  );

  const handleInterim = useCallback((text: string) => setInterim(text), []);

  const handleError = useCallback((err: string) => {
    if (err === "not-allowed" || err === "service-not-allowed") {
      setErrorMsg(
        "Microphone permission was denied. Allow mic access in your browser settings, then start again. You can still use +1.",
      );
    } else if (err === "audio-capture") {
      setErrorMsg("No microphone was found on this device. You can still count with +1.");
    } else if (err === "network") {
      setErrorMsg("Speech recognition needs an internet connection — retrying…");
    } else if (err === "restart-failed") {
      setErrorMsg("Voice recognition kept stopping. Please tap the mic to start listening again.");
    } else {
      setErrorMsg("Voice recognition error: " + err);
    }
  }, []);


  const { listening, start, stop } = useSpeechRecognition({
    lang: "ar-SA",
    onFinal: handleFinal,
    onInterim: handleInterim,
    onError: handleError,
  });

  const toggleListen = () => {
    setErrorMsg(null);
    if (!supported) return;
    if (!calibrated) {
      navigate({ to: "/calibrate/$id", params: { id: selected.id } });
      return;
    }
    if (listening) {
      stop();
      setTimerRunning(false);
    } else {
      start();
      beginSession();
    }
  };

  // ---------------- target completion ----------------
  const celebratedForRef = useRef<number | null>(null);
  useEffect(() => {
    if (!target || count < target) return;
    if (celebratedForRef.current === target) return;
    celebratedForRef.current = target;
    setCelebrating(true);
    setTimerRunning(false);
    playCompletionCue();
  }, [count, target]);

  useEffect(() => {
    if (target !== celebratedForRef.current) celebratedForRef.current = null;
  }, [target]);

  const buildSession = (): DhikrSession => {
    const now = Date.now();
    const began = startedAt ?? now;
    return {
      id: `${began}-${Math.random().toString(36).slice(2, 8)}`,
      dhikrId: selected.id,
      dhikrTransliteration: selected.transliteration,
      count,
      target,
      completed: !!target && count >= target,
      durationMs: elapsed || now - began,
      startedAt: began,
      endedAt: now,
    };
  };

  const clearSessionState = () => {
    setCount(0);
    queueRef.current = 0;
    if (drainRef.current !== null) {
      window.clearTimeout(drainRef.current);
      drainRef.current = null;
    }
    setStartedAt(null);
    setElapsed(0);
    setTimerRunning(false);
    setLastMatchAt(null);
    celebratedForRef.current = null;
    setCelebrating(false);
  };

  const requestReset = () => {
    if (count === 0) {
      clearSessionState();
      return;
    }
    setTimerRunning(false);
    setSummary(buildSession());
  };

  const finishSession = (save: boolean) => {
    if (save && summary) {
      saveSession(summary);
      setStreaks(computeStreaks());
    }
    setSummary(null);
    clearSessionState();
  };

  // Reset counter when switching dhikr
  useEffect(() => {
    clearSessionState();
    if (listening) stop();
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = target ? Math.min(100, (count / target) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 pt-6 pb-2 flex items-center justify-between max-w-md mx-auto w-full">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dhikr</p>
          <h1 className="text-2xl font-semibold text-foreground">Companion</h1>
        </div>
        <div className="flex items-center gap-1">
          {streaks.current > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-1 text-xs font-medium text-foreground">
              <Flame className="w-3.5 h-3.5" /> {streaks.current}d
            </span>
          )}
          <Link
            to="/history"
            className="rounded-full p-2.5 hover:bg-secondary transition-colors"
            aria-label="Session history"
          >
            <History className="w-5 h-5 text-muted-foreground" />
          </Link>
          <Link
            to="/settings"
            className="rounded-full p-2.5 hover:bg-secondary transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon className="w-5 h-5 text-muted-foreground" />
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 pb-8 flex flex-col gap-6">
        {/* Dhikr selection */}
        <div className="grid grid-cols-2 gap-3">
          {DHIKR_LIST.map((d) => {
            const isSel = d.id === selectedId;
            const prof = loadProfile(d.id);
            const isCal = !!prof && prof.samples.length >= 5;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  isSel
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <p className="font-arabic text-xl leading-tight text-foreground" lang="ar">
                  {d.arabic}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{d.transliteration}</p>
                <p
                  className={`mt-2 text-[11px] font-medium ${
                    isCal ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {isCal ? "● Voice profile ready" : "○ Not calibrated"}
                </p>
              </button>
            );
          })}
        </div>

        {/* Selected dhikr display + meaning */}
        <div className="rounded-3xl bg-card border border-border p-6 text-center">
          <p className="font-arabic text-4xl leading-relaxed text-primary" lang="ar">
            {selected.arabic}
          </p>
          <p className="mt-2 text-base text-muted-foreground">{selected.transliteration}</p>
          {selected.meaning && (
            <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-foreground/80 italic">
              “{selected.meaning}”
            </p>
          )}
          {!calibrated && (
            <Link
              to="/calibrate/$id"
              params={{ id: selected.id }}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-medium"
            >
              Set Up Voice Profile
            </Link>
          )}
        </div>

        {/* Target selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Target</p>
            <button
              onClick={() => setTarget(null)}
              className={`text-xs ${target === null ? "text-primary font-medium" : "text-muted-foreground"}`}
            >
              No target
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {TARGET_PRESETS.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTarget(t);
                  setCustomOpen(false);
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  target === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {t}
              </button>
            ))}
            <button
              onClick={() => setCustomOpen((o) => !o)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                customOpen ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              Custom
            </button>
          </div>
          {customOpen && (
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = parseInt(customValue, 10);
                if (Number.isFinite(n) && n > 0) {
                  setTarget(n);
                  setCustomOpen(false);
                }
              }}
            >
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="e.g. 500"
                aria-label="Custom target"
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
              >
                Set
              </button>
            </form>
          )}
        </div>

        {/* Counter */}
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Count</p>
          <div
            className={`text-[6.5rem] leading-none font-bold text-foreground tabular-nums transition-transform duration-200 ${
              lastMatchAt && Date.now() - lastMatchAt < 400 ? "scale-105" : "scale-100"
            }`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {count}
          </div>
          {target !== null && (
            <>
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                {count} / {target}
              </p>
              <div className="mt-2 h-1.5 w-40 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Session Time{" "}
              <span className="tabular-nums text-foreground">{formatDuration(elapsed)}</span>
            </span>
          </div>
          <div className="h-6 mt-2 text-sm text-muted-foreground">
            {listening ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Listening…{interim && ` "${interim.slice(-24)}"`}
              </span>
            ) : (
              <span>{calibrated ? "Ready to listen" : "Calibrate to start"}</span>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!supported && (
          <div className="rounded-xl bg-secondary text-secondary-foreground text-sm px-4 py-3">
            Your browser does not support voice recognition. You can still use the +1 button below.
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-start gap-5">
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setCount((c) => Math.max(0, c - 1))}
                className="w-12 h-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95 transition"
                aria-label="Subtract one"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-[11px] text-muted-foreground">Undo 1</span>
            </div>
            <button
              onClick={toggleListen}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-primary-foreground shadow-lg transition-all active:scale-95 bg-primary ${
                listening ? "mic-pulse" : ""
              }`}
              aria-label={listening ? "Stop listening" : "Start listening"}
            >
              {listening ? <MicOff className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
            </button>
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => {
                  setCount((c) => c + 1);
                  setLastMatchAt(Date.now());
                  beginSession();
                }}
                className="w-12 h-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95 transition"
                aria-label="Add one"
              >
                <Plus className="w-5 h-5" />
              </button>
              <span className="text-[11px] text-muted-foreground">Add 1</span>
            </div>
          </div>
          <p className="text-sm font-medium text-foreground">
            {listening ? "Stop Listening" : "Start Listening"}
          </p>

          <button
            onClick={requestReset}
            className="w-full rounded-xl bg-secondary text-secondary-foreground py-3 font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            <RotateCcw className="w-4 h-4" /> End Session
          </button>
        </div>

        {/* Debug mode */}
        <div className="pt-2 space-y-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => {
                setSound(e.target.checked);
                setSoundEnabled(e.target.checked);
              }}
              className="accent-primary"
            />
            Completion sound
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => {
                setDebugMode(e.target.checked);
                localStorage.setItem("dhikr.debug", e.target.checked ? "1" : "0");
              }}
              className="accent-primary"
            />
            Debug mode
          </label>

          {debugMode && (
            <div className="mt-3 rounded-2xl border border-border bg-card p-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Hearing: <span className="text-foreground">{interim || "—"}</span>
              </p>
              {debugLog.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No results yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {debugLog.map((d) => (
                    <li key={d.at + d.text} className="text-[11px] leading-snug">
                      <span className={d.ok ? "text-primary" : "text-destructive"}>
                        {d.ok ? "✓" : "✕"}
                      </span>{" "}
                      <span className="text-foreground">"{d.text}"</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {d.reason} (score {d.score.toFixed(2)})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => setDebugLog([])}
                className="text-[11px] text-muted-foreground underline"
              >
                Clear log
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Completion celebration */}
      {celebrating && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 text-center shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
              ✅
            </div>
            <h2 className="text-xl font-semibold text-foreground">Alhamdulillah!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You completed your dhikr target of {target}.
            </p>
            <p className="mt-3 font-arabic text-2xl text-primary" lang="ar">
              {selected.arabic}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => {
                  setCelebrating(false);
                  setTimerRunning(true);
                }}
                className="rounded-xl bg-secondary text-secondary-foreground py-3 font-medium"
              >
                Continue counting
              </button>
              <button
                onClick={() => {
                  setCelebrating(false);
                  setSummary(buildSession());
                }}
                className="rounded-xl bg-primary text-primary-foreground py-3 font-medium"
              >
                Start a new session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session summary before reset */}
      {summary && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-lg font-semibold text-foreground">Today's Session</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Dhikr" value={summary.dhikrTransliteration} />
              <Row
                label="Completed"
                value={
                  summary.target
                    ? `${summary.count} / ${summary.target}${summary.completed ? " ✓" : ""}`
                    : `${summary.count}`
                }
              />
              <Row label="Duration" value={humanDuration(summary.durationMs)} />
              <Row
                label="Average pace"
                value={`${averagePace(summary.count, summary.durationMs)} per minute`}
              />
              <Row
                label="Date"
                value={new Date(summary.endedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
              <Row
                label="Time"
                value={new Date(summary.endedAt).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              />
            </dl>
            <p className="mt-5 text-sm text-muted-foreground">
              Would you like to save this session before starting a new one?
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => finishSession(true)}
                className="rounded-xl bg-primary text-primary-foreground py-3 font-medium"
              >
                Save &amp; start new session
              </button>
              <button
                onClick={() => finishSession(false)}
                className="rounded-xl bg-secondary text-secondary-foreground py-3 font-medium"
              >
                Discard session
              </button>
              <button
                onClick={() => {
                  setSummary(null);
                  setTimerRunning(true);
                }}
                className="py-2 text-sm text-muted-foreground"
              >
                Keep counting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground text-right">{value}</dd>
    </div>
  );
}
