import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typed wrapper around the Web Speech API. Modular so we can swap
// in a different recognition provider later without changing UI code.

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported() {
  return getRecognitionCtor() !== null;
}

export type FinalTranscript = {
  transcript: string;
  at: number;
};

type Options = {
  lang?: string;
  onFinal?: (t: FinalTranscript) => void;
  onInterim?: (t: string) => void;
  onError?: (err: string) => void;
};

export function useSpeechRecognition(opts: Options = {}) {
  const { lang = "ar-SA", onFinal, onInterim, onError } = opts;
  // `listening` reflects the USER's intent (counting mode), not the engine's
  // internal session. Browsers end a recognition session after each utterance
  // or a silence timeout, so engine sessions are restarted transparently.
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldRunRef = useRef(false);
  const startingRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  // Guard against a tight restart loop when the mic/browser is genuinely broken.
  const failStreakRef = useRef(0);
  const langRef = useRef(lang);
  langRef.current = lang;
  const cbRef = useRef({ onFinal, onInterim, onError });
  cbRef.current = { onFinal, onInterim, onError };

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  const spawn = useCallback(() => {
    if (!shouldRunRef.current) return;
    if (recRef.current || startingRef.current) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      shouldRunRef.current = false;
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = langRef.current;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    const scheduleRestart = (delay: number) => {
      if (!shouldRunRef.current) return;
      if (restartTimerRef.current !== null) return;
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        spawn();
      }, delay);
    };

    rec.onstart = () => {
      startingRef.current = false;
      failStreakRef.current = 0;
    };
    rec.onresult = (event) => {
      failStreakRef.current = 0;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const text = r[0].transcript;
        if (r.isFinal) {
          cbRef.current.onFinal?.({ transcript: text, at: Date.now() });
        } else {
          interim += text;
        }
      }
      if (interim) cbRef.current.onInterim?.(interim);
    };
    rec.onerror = (e) => {
      const err = e.error;
      // Silence and self-inflicted aborts are normal during long sessions:
      // never surface them, never leave counting mode.
      if (err === "no-speech" || err === "aborted") return;
      if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") {
        // Unrecoverable without user action — leave counting mode.
        shouldRunRef.current = false;
        setListening(false);
        cbRef.current.onError?.(err);
        return;
      }
      // network / unknown: recoverable, retry with backoff via onend.
      failStreakRef.current += 1;
      cbRef.current.onError?.(err);
    };
    rec.onend = () => {
      startingRef.current = false;
      if (recRef.current === rec) recRef.current = null;
      if (!shouldRunRef.current) {
        setListening(false);
        return;
      }
      if (failStreakRef.current >= 5) {
        shouldRunRef.current = false;
        setListening(false);
        cbRef.current.onError?.("restart-failed");
        return;
      }
      // Backoff only grows while sessions keep failing; a normal end restarts fast.
      scheduleRestart(failStreakRef.current > 0 ? 400 * failStreakRef.current : 120);
    };

    recRef.current = rec;
    startingRef.current = true;
    try {
      rec.start();
    } catch {
      // "already started" — drop this instance and retry shortly.
      startingRef.current = false;
      recRef.current = null;
      failStreakRef.current += 1;
      scheduleRestart(300);
    }
  }, []);

  const start = useCallback(() => {
    if (!getRecognitionCtor()) {
      setSupported(false);
      return;
    }
    shouldRunRef.current = true;
    failStreakRef.current = 0;
    setListening(true);
    spawn();
  }, [spawn]);

  const stop = useCallback(() => {
    shouldRunRef.current = false;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    const rec = recRef.current;
    recRef.current = null;
    startingRef.current = false;
    if (rec) {
      try {
        rec.onend = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.abort();
      } catch {
        /* ignore */
      }
    }
    setListening(false);
  }, []);

  useEffect(
    () => () => {
      shouldRunRef.current = false;
      if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
      try {
        recRef.current?.abort?.();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    },
    [],
  );

  return { listening, supported, start, stop };
}

