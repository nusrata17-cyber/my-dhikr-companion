import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDhikr, DHIKR_LIST } from "@/lib/dhikr/data";
import { bestSimilarity } from "@/lib/dhikr/normalize";
import { loadProfile, saveProfile, type VoiceSample } from "@/lib/dhikr/storage";
import {
  isSpeechRecognitionSupported,
  useSpeechRecognition,
} from "@/lib/dhikr/useSpeechRecognition";
import { ArrowLeft, Mic, Check, RotateCw } from "lucide-react";

export const Route = createFileRoute("/calibrate/$id")({
  head: ({ params }) => {
    const d = getDhikr(params.id);
    const name = d?.transliteration ?? "Dhikr";
    return {
      meta: [
        { title: `Calibrate ${name} — Dhikr Counter` },
        {
          name: "description",
          content: `Teach Dhikr Counter how you naturally recite ${name}.`,
        },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: Calibrate,
});

const REQUIRED = 5;
const MIN_SIMILARITY = 0.5;

function Calibrate() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const dhikr = getDhikr(id) ?? DHIKR_LIST[0];

  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [status, setStatus] = useState<"idle" | "listening" | "got" | "retry" | "done">("idle");
  const [feedback, setFeedback] = useState("");
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const capturedThisRoundRef = useRef(false);
  const startedAtRef = useRef(0);

  useEffect(() => setSupported(isSpeechRecognitionSupported()), []);

  const references = useMemo(() => dhikr.canonical, [dhikr]);

  const acceptSample = useCallback(
    (transcript: string) => {
      if (capturedThisRoundRef.current) return;
      const sim = bestSimilarity(transcript, references);
      if (sim < MIN_SIMILARITY) {
        setStatus("retry");
        setFeedback("Please try again");
        return;
      }
      capturedThisRoundRef.current = true;
      const sample: VoiceSample = {
        transcript,
        durationMs: Date.now() - startedAtRef.current,
        capturedAt: Date.now(),
      };
      setSamples((prev) => {
        const next = [...prev, sample];
        saveProfile({
          dhikrId: dhikr.id,
          version: 1,
          samples: next,
          updatedAt: Date.now(),
        });
        if (next.length >= REQUIRED) {
          setStatus("done");
          setFeedback("");
        } else {
          setStatus("got");
          setFeedback("Got it!");
        }
        return next;
      });
    },
    [dhikr.id, references],
  );

  const { listening, start, stop } = useSpeechRecognition({
    lang: "ar-SA",
    onFinal: ({ transcript }) => {
      acceptSample(transcript);
      stop();
    },
    onInterim: (t) => setInterim(t),
    onError: (err) => {
      if (err === "not-allowed") setFeedback("Microphone permission was denied.");
      else setFeedback("Please try again");
      setStatus("retry");
    },
  });

  useEffect(() => {
    const existing = loadProfile(dhikr.id);
    if (existing?.samples) setSamples(existing.samples.slice(0, REQUIRED));
  }, [dhikr.id]);

  const startSample = () => {
    if (!supported) return;
    capturedThisRoundRef.current = false;
    startedAtRef.current = Date.now();
    setInterim("");
    setFeedback("Listening…");
    setStatus("listening");
    start();
  };

  const retry = () => {
    // Drop the last sample if it was recorded, otherwise just re-arm
    stop();
    setStatus("idle");
    setFeedback("");
    setInterim("");
  };

  const restart = () => {
    stop();
    setSamples([]);
    saveProfile({ dhikrId: dhikr.id, version: 1, samples: [], updatedAt: Date.now() });
    setStatus("idle");
    setFeedback("");
    setInterim("");
  };

  const progress = samples.length;
  const isDone = progress >= REQUIRED;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 pt-6 pb-2 flex items-center justify-between max-w-md mx-auto w-full">
        <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-secondary" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Step 1 of 1
        </p>
        <button
          onClick={restart}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Restart
        </button>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 pb-8 flex flex-col">
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">Learning how you pronounce</p>
          <p className="font-arabic text-4xl mt-3 text-primary leading-relaxed" lang="ar">
            {dhikr.arabic}
          </p>
          <p className="mt-2 text-lg font-medium text-foreground">{dhikr.transliteration}</p>
          <p className="mt-4 text-sm text-muted-foreground max-w-xs mx-auto">
            Please say the complete dhikr naturally. Leave a short pause between each one.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: REQUIRED }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i < progress ? "bg-primary w-8" : "bg-border w-4"
              }`}
            />
          ))}
        </div>
        <p className="text-center mt-3 text-sm font-medium text-foreground">
          {progress} / {REQUIRED} {isDone ? "complete" : ""}
        </p>

        {/* Mic circle */}
        <div className="flex-1 flex flex-col items-center justify-center py-8">
          {!isDone ? (
            <>
              <button
                onClick={listening ? () => stop() : startSample}
                disabled={!supported}
                className={`w-28 h-28 rounded-full flex items-center justify-center text-primary-foreground shadow-lg transition ${
                  listening ? "bg-primary mic-pulse" : "bg-primary active:scale-95"
                }`}
                aria-label="Record sample"
              >
                <Mic className="w-10 h-10" />
              </button>
              <p className="mt-5 text-sm text-muted-foreground h-5">
                {feedback ||
                  (interim ? `"${interim.slice(-30)}"` : "Tap to record sample")}
              </p>
              {status === "retry" && (
                <button
                  onClick={retry}
                  className="mt-3 inline-flex items-center gap-2 text-sm text-primary font-medium"
                >
                  <RotateCw className="w-4 h-4" /> Try again
                </button>
              )}
              {!supported && (
                <p className="mt-4 text-center text-sm text-destructive px-6">
                  Your browser does not support voice recognition. Try Chrome or Safari on
                  mobile.
                </p>
              )}
            </>
          ) : (
            <div className="text-center px-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Check className="w-12 h-12 text-primary" />
              </div>
              <h2 className="mt-6 text-xl font-semibold text-foreground">
                Your personal dhikr voice profile is ready 🤍
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You can now start counting your dhikr.
              </p>
              <button
                onClick={() => navigate({ to: "/" })}
                className="mt-8 w-full rounded-2xl bg-primary text-primary-foreground py-4 font-semibold"
              >
                Start Counting
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
