import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteCustomDhikr,
  loadCustomDhikr,
  saveCustomDhikr,
  type CustomDhikr,
} from "@/lib/dhikr/custom";
import {
  isSpeechRecognitionSupported,
  useSpeechRecognition,
} from "@/lib/dhikr/useSpeechRecognition";
import { ArrowLeft, Check, Keyboard, Mic, MicOff, Pencil, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/custom")({
  head: () => ({
    meta: [
      { title: "Custom Dhikr — Dhikr Companion" },
      {
        name: "description",
        content:
          "Create your own dhikr, salawat or dua by typing it or reciting it aloud, review what the app heard, then count it by voice.",
      },
      { property: "og:title", content: "Custom Dhikr — Dhikr Companion" },
      {
        property: "og:description",
        content: "Add your own dhikr, salawat or dua and count it by voice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomDhikrPage;
});

type Step = "list" | "choose" | "type" | "record" | "review";

function CustomDhikrPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<CustomDhikr[]>([]);
  const [step, setStep] = useState<Step>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  // draft fields
  const [name, setName] = useState("");
  const [phrase, setPhrase] = useState("");
  const [arabic, setArabic] = useState("");
  const [transliteration, setTransliteration] = useState("");
  const [meaning, setMeaning] = useState("");

  const [heard, setHeard] = useState("");
  const [interim, setInterim] = useState("");
  const heardRef = useRef("");

  useEffect(() => {
    setList(loadCustomDhikr());
    setSupported(isSpeechRecognitionSupported());
  }, []);

  const resetDraft = () => {
    setEditingId(null);
    setName("");
    setPhrase("");
    setArabic("");
    setTransliteration("");
    setMeaning("");
    setHeard("");
    heardRef.current = "";
    setInterim("");
  };

  const onFinal = useCallback(({ transcript }: { transcript: string }) => {
    heardRef.current = (heardRef.current + " " + transcript).trim();
    setHeard(heardRef.current);
    setInterim("");
  }, []);

  const { listening, start, stop } = useSpeechRecognition({
    lang: "ar-SA",
    onFinal,
    onInterim: setInterim,
    onError: () => setInterim(""),
  });

  useEffect(() => () => stop(), [stop]);

  const beginRecord = () => {
    setHeard("");
    heardRef.current = "";
    setInterim("");
    setStep("record");
    start();
  };

  const finishRecord = () => {
    stop();
    setPhrase(heardRef.current.trim());
    setTransliteration((t) => t || heardRef.current.trim());
    setStep("review");
  };

  const confirmAndSave = () => {
    const saved = saveCustomDhikr(
      { name, phrase, arabic, transliteration, meaning },
      editingId ?? undefined,
    );
    setList(loadCustomDhikr());
    localStorage.setItem("dhikr.selected", saved.id);
    navigate({ to: "/calibrate/$id", params: { id: saved.id } });
  };

  const startEdit = (d: CustomDhikr) => {
    setEditingId(d.id);
    setName(d.name);
    setPhrase(d.canonical[0] ?? d.transliteration);
    setArabic(d.arabic);
    setTransliteration(d.transliteration);
    setMeaning(d.meaning);
    setHeard("");
    heardRef.current = "";
    setStep("type");
  };

  const useForCounting = (d: CustomDhikr) => {
    localStorage.setItem("dhikr.selected", d.id);
    navigate({ to: "/" });
  };

  const remove = (d: CustomDhikr) => {
    if (!window.confirm(`Delete "${d.name}"? This also removes its voice profile.`)) return;
    deleteCustomDhikr(d.id);
    setList(loadCustomDhikr());
    if (localStorage.getItem("dhikr.selected") === d.id) localStorage.removeItem("dhikr.selected");
  };

  const canContinue = phrase.trim().length >= 3;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 pt-6 pb-2 flex items-center justify-between max-w-md mx-auto w-full">
        <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-secondary" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Custom Dhikr</p>
        <span className="w-9" />
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 pb-10 flex flex-col gap-6">
        {step === "list" && (
          <>
            <div>
              <h1 className="text-xl font-semibold text-foreground">My Custom Dhikr</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Track any dhikr, salawat or dua — type it, or recite it and let the app write it
                down for you.
              </p>
            </div>

            {list.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                You have not created a custom dhikr yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {list.map((d) => (
                  <li key={d.id} className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">{d.name}</p>
                    <p className="mt-1 font-arabic text-lg leading-relaxed text-primary" lang="ar">
                      {d.arabic}
                    </p>
                    {d.transliteration !== d.arabic && (
                      <p className="mt-1 text-sm text-muted-foreground">{d.transliteration}</p>
                    )}
                    {d.meaning && (
                      <p className="mt-1 text-xs italic text-foreground/70">“{d.meaning}”</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => useForCounting(d)}
                        className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground"
                      >
                        Use this
                      </button>
                      <button
                        onClick={() => startEdit(d)}
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-secondary-foreground"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => remove(d)}
                        className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3.5 py-1.5 text-xs font-medium text-destructive"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => {
                resetDraft();
                setStep("choose");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground"
            >
              <Plus className="w-4 h-4" /> New Custom Dhikr
            </button>
          </>
        )}

        {step === "choose" && (
          <>
            <div>
              <h1 className="text-xl font-semibold text-foreground">How would you like to add it?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You will always get to review and correct the phrase before counting starts.
              </p>
            </div>
            <button
              onClick={() => setStep("type")}
              className="rounded-2xl border border-border bg-card p-5 text-left hover:border-primary/40 transition"
            >
              <span className="inline-flex items-center gap-2 font-medium text-foreground">
                <Keyboard className="w-4 h-4 text-primary" /> Type the dhikr
              </span>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter Arabic text, transliteration and meaning yourself.
              </p>
            </button>
            <button
              onClick={beginRecord}
              disabled={!supported}
              className="rounded-2xl border border-border bg-card p-5 text-left hover:border-primary/40 transition disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2 font-medium text-foreground">
                <Mic className="w-4 h-4 text-primary" /> Record the dhikr
              </span>
              <p className="mt-1 text-sm text-muted-foreground">
                Recite it aloud — best for salawat, duas and longer recitations.
              </p>
            </button>
            {!supported && (
              <p className="text-sm text-destructive">
                Voice recording is not supported in this browser — you can still type your dhikr.
              </p>
            )}
            <button
              onClick={() => setStep("list")}
              className="py-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </>
        )}

        {step === "type" && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canContinue) setStep("review");
            }}
          >
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {editingId ? "Edit custom dhikr" : "Type your dhikr"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Only the phrase to listen for is required.
              </p>
            </div>
            <Field label="Name" hint="e.g. Salawat, Morning Dua">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Custom Dhikr"
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
              />
            </Field>
            <Field label="Phrase to listen for" hint="Transliteration or Arabic — as you recite it">
              <textarea
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                rows={3}
                placeholder="Allahumma salli ala Muhammad wa ala ali Muhammad"
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
              />
            </Field>
            <Field label="Arabic text (optional)">
              <textarea
                value={arabic}
                onChange={(e) => setArabic(e.target.value)}
                rows={2}
                lang="ar"
                dir="rtl"
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 font-arabic text-lg"
              />
            </Field>
            <Field label="Transliteration (optional)">
              <input
                value={transliteration}
                onChange={(e) => setTransliteration(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
              />
            </Field>
            <Field label="English meaning (optional)">
              <textarea
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
              />
            </Field>
            <button
              type="submit"
              disabled={!canContinue}
              className="rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground disabled:opacity-50"
            >
              Continue
            </button>
            {supported && !editingId && (
              <button
                type="button"
                onClick={beginRecord}
                className="inline-flex items-center justify-center gap-2 py-2 text-sm text-primary"
              >
                <Mic className="w-4 h-4" /> Record it instead
              </button>
            )}
            <button
              type="button"
              onClick={() => setStep("list")}
              className="py-1 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </form>
        )}

        {step === "record" && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Recite your dhikr</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Say the complete dhikr once, calmly. Tap done when you finish — nothing is counted
                yet.
              </p>
            </div>
            <button
              onClick={listening ? () => stop() : () => start()}
              className={`w-28 h-28 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg ${
                listening ? "mic-pulse" : "active:scale-95"
              }`}
              aria-label={listening ? "Pause recording" : "Resume recording"}
            >
              {listening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
            </button>
            <p className="min-h-6 text-sm text-muted-foreground">
              {listening ? "Listening…" : "Paused"}
            </p>
            <div className="w-full rounded-2xl border border-border bg-card p-4 text-left">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Heard</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {heard || interim || "—"}
              </p>
            </div>
            <button
              onClick={finishRecord}
              disabled={!heardRef.current.trim()}
              className="w-full rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground disabled:opacity-50"
            >
              Done — review what was heard
            </button>
            <button
              onClick={() => {
                stop();
                setStep("choose");
              }}
              className="py-1 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {step === "review" && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Does this look correct?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This is the phrase the app will listen for. Correct anything that was misheard.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Your custom dhikr
              </p>
              <textarea
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                rows={4}
                aria-label="Confirmed phrase"
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed"
              />
              {arabic && arabic !== phrase && (
                <p className="mt-2 font-arabic text-lg text-primary" lang="ar">
                  {arabic}
                </p>
              )}
              {meaning && <p className="mt-2 text-xs italic text-foreground/70">“{meaning}”</p>}
            </div>
            <button
              onClick={() => setStep("type")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary py-3 text-sm font-medium text-secondary-foreground"
            >
              <Pencil className="w-4 h-4" /> Edit details
            </button>
            <button
              onClick={confirmAndSave}
              disabled={!canContinue}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Confirm &amp; continue
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Next: a short voice calibration, then you can start counting.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
      {hint && <span className="ml-2 text-[11px] text-muted-foreground">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
