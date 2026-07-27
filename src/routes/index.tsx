import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DHIKR_LIST, getDhikr } from "@/lib/dhikr/data";
import { loadProfile, recordFeedback } from "@/lib/dhikr/storage";
import { normalize } from "@/lib/dhikr/normalize";
import {
  describeReason,
  matchTranscript,
  prepareReferences,
  scoreAgainst,
} from "@/lib/dhikr/matcher";

import {
  isSpeechRecognitionSupported,
  useSpeechRecognition,
} from "@/lib/dhikr/useSpeechRecognition";
import { Mic, MicOff, Plus, RotateCcw, Settings as SettingsIcon, Check, X, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dhikr Counter — Voice-powered remembrance" },
      {
        name: "description",
        content:
          "A peaceful, private voice-powered dhikr counter. Recite Astaghfirullah or La ilaha illallah and let the app count each repetition.",
      },
      { property: "og:title", content: "Dhikr Counter" },
      {
        property: "og:description",
        content: "Voice-powered dhikr counter — recite and let the app count.",
      },
    ],
  }),
  component: Home,
});

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
  const [confirmReset, setConfirmReset] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [supported, setSupported] = useState(true);

  const selected = getDhikr(selectedId) ?? DHIKR_LIST[0];
  const profile = useMemo(() => loadProfile(selected.id), [selected.id, lastMatchAt]);
  const calibrated = !!profile && profile.samples.length >= 5;

  const [debugMode, setDebugMode] = useState(false);
  type DebugEntry = { at: number; text: string; ok: boolean; reason: string; score: number };
  const [debugLog, setDebugLog] = useState<DebugEntry[]>([]);

  const lastCountAtRef = useRef(0);

  useEffect(() => {
    setDebugMode(localStorage.getItem("dhikr.debug") === "1");
  }, []);


  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    localStorage.setItem("dhikr.selected", selectedId);
  }, [selectedId]);

  // References = canonical spellings + calibration transcripts that were
  // verified to actually be this dhikr. Calibration widens accepted spellings,
  // it never lets a different phrase count.
  const references = useMemo(() => {
    const canonical = prepareReferences(selected.canonical);
    const samples = (profile?.samples ?? [])
      .map((s) => s.transcript)
      .filter((t) => scoreAgainst(t, canonical) >= 0.7);
    return prepareReferences([...selected.canonical, ...samples]);
  }, [selected, profile]);

  const lastTranscriptRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });

  const handleFinal = useCallback(
    ({ transcript, at }: { transcript: string; at: number }) => {
      setInterim("");
      // Duplicate guard: the engine can re-emit the same final utterance
      const norm = normalize(transcript);
      if (norm && norm === lastTranscriptRef.current.text && at - lastTranscriptRef.current.at < 1500) {
        setDebugLog((l) =>
          [{ at, text: transcript, ok: false, reason: describeReason("duplicate"), score: 1 }, ...l].slice(0, 12),
        );
        return;
      }
      lastTranscriptRef.current = { text: norm, at };

      const result = matchTranscript(transcript, references);
      setDebugLog((l) =>
        [
          {
            at,
            text: transcript,
            ok: result.accepted,
            reason: result.accepted
              ? `Accepted ×${result.count}`
              : describeReason(result.reason),
            score: result.bestScore,
          },
          ...l,
        ].slice(0, 12),
      );
      if (!result.accepted) return;
      setCount((c) => c + result.count);
      setLastMatchAt(at);
      setShowFeedback(true);
    },
    [references],
  );

  // Interim results are shown only — never counted (prevents double counting).
  const handleInterim = useCallback((text: string) => setInterim(text), []);

  const handleError = useCallback((err: string) => {
    if (err === "not-allowed" || err === "service-not-allowed") {
      setErrorMsg("Microphone permission was denied. You can still use +1.");
    } else if (err === "audio-capture") {
      setErrorMsg("No microphone was found on this device.");
    } else if (err === "network") {
      setErrorMsg("Speech recognition needs an internet connection.");
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
    if (listening) stop();
    else start();
  };

  const reset = () => {
    setCount(0);
    setConfirmReset(false);
    setShowFeedback(false);
  };

  const sendFeedback = (kind: "correct" | "missed" | "wrong") => {
    recordFeedback({ dhikrId: selected.id, kind, at: Date.now() });
    if (kind === "missed") setCount((c) => c + 1);
    if (kind === "wrong") setCount((c) => Math.max(0, c - 1));
    setShowFeedback(false);
  };

  // Reset counter when switching dhikr
  useEffect(() => {
    setCount(0);
    lastCountAtRef.current = 0;
    if (listening) stop();
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 pt-6 pb-2 flex items-center justify-between max-w-md mx-auto w-full">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dhikr</p>
          <h1 className="text-2xl font-semibold text-foreground">Counter</h1>
        </div>
        <Link
          to="/settings"
          className="rounded-full p-2.5 hover:bg-secondary transition-colors"
          aria-label="Settings"
        >
          <SettingsIcon className="w-5 h-5 text-muted-foreground" />
        </Link>
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
                <p
                  className="font-arabic text-xl leading-tight text-foreground"
                  lang="ar"
                >
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

        {/* Selected dhikr display */}
        <div className="rounded-3xl bg-card border border-border p-6 text-center">
          <p className="font-arabic text-4xl leading-relaxed text-primary" lang="ar">
            {selected.arabic}
          </p>
          <p className="mt-2 text-base text-muted-foreground">{selected.transliteration}</p>
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

        {/* Counter */}
        <div className="flex-1 flex flex-col items-center justify-center py-6">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Count</p>
          <div
            className={`text-[7rem] leading-none font-bold text-foreground tabular-nums transition-transform ${
              lastMatchAt && Date.now() - lastMatchAt < 400 ? "scale-105" : "scale-100"
            }`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {count}
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
          <button
            onClick={toggleListen}
            disabled={!supported && !!supported}
            className={`w-24 h-24 rounded-full flex items-center justify-center text-primary-foreground shadow-lg transition-all active:scale-95 ${
              listening ? "bg-primary mic-pulse" : "bg-primary"
            }`}
            aria-label={listening ? "Stop listening" : "Start listening"}
          >
            {listening ? <MicOff className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
          </button>
          <p className="text-sm font-medium text-foreground">
            {listening ? "Stop Listening" : "Start Listening"}
          </p>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={() => {
                setCount((c) => c + 1);
                lastCountAtRef.current = Date.now();
              }}
              className="rounded-xl bg-secondary text-secondary-foreground py-3 font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <Plus className="w-4 h-4" /> +1
            </button>
            <button
              onClick={() => (confirmReset ? reset() : setConfirmReset(true))}
              className={`rounded-xl py-3 font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition ${
                confirmReset
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <RotateCcw className="w-4 h-4" /> {confirmReset ? "Tap to confirm" : "Reset"}
            </button>
          </div>
        </div>

        {/* Feedback */}
        {showFeedback && lastMatchAt && (
          <div className="rounded-2xl border border-border bg-card p-3 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground pl-1">How was that?</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => sendFeedback("correct")}
                className="rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Correct
              </button>
              <button
                onClick={() => sendFeedback("missed")}
                className="rounded-lg bg-secondary text-secondary-foreground px-3 py-1.5 text-xs font-medium"
              >
                Missed
              </button>
              <button
                onClick={() => sendFeedback("wrong")}
                className="rounded-lg bg-secondary text-secondary-foreground px-3 py-1.5 text-xs font-medium flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Wrong
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
