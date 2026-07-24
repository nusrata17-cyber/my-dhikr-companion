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
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldRunRef = useRef(false);
  const cbRef = useRef({ onFinal, onInterim, onError });
  cbRef.current = { onFinal, onInterim, onError };

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    if (recRef.current) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onresult = (event) => {
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
      if (e.error !== "no-speech" && e.error !== "aborted") {
        cbRef.current.onError?.(e.error);
      }
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      // Auto-restart while user hasn't stopped (browsers time out ~60s)
      if (shouldRunRef.current) {
        setTimeout(() => {
          if (shouldRunRef.current) start();
        }, 150);
      }
    };
    recRef.current = rec;
    shouldRunRef.current = true;
    try {
      rec.start();
    } catch {
      /* already started */
    }
  }, [lang]);

  const stop = useCallback(() => {
    shouldRunRef.current = false;
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    setListening(false);
  }, []);

  useEffect(() => () => {
    shouldRunRef.current = false;
    recRef.current?.abort?.();
  }, []);

  return { listening, supported, start, stop };
}
