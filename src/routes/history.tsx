import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  averagePace,
  clearSessions,
  computeStreaks,
  deleteSession,
  humanDuration,
  loadSessions,
  todayTotal,
  type DhikrSession,
} from "@/lib/dhikr/session";
import { ArrowLeft, Flame, Trash2 } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Session History & Streaks — Dhikr Companion" },
      {
        name: "description",
        content:
          "Review your past dhikr sessions, total repetitions, durations and your current and longest daily streaks.",
      },
      { property: "og:title", content: "Dhikr Session History" },
      {
        property: "og:description",
        content: "Past dhikr sessions, pace, targets and daily streaks — stored on your device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [sessions, setSessions] = useState<DhikrSession[]>([]);
  const [streaks, setStreaks] = useState({ current: 0, longest: 0 });
  const [today, setToday] = useState(0);

  const refresh = () => {
    const list = loadSessions();
    setSessions(list);
    setStreaks(computeStreaks(list));
    setToday(todayTotal(list));
  };

  useEffect(refresh, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 max-w-md mx-auto w-full">
        <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-secondary" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Session History</h1>
      </header>

      <main className="max-w-md mx-auto w-full px-5 pb-12 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat icon label="Current streak" value={`${streaks.current}d`} />
          <Stat label="Longest streak" value={`${streaks.longest}d`} />
          <Stat label="Today" value={String(today)} />
        </div>

        {sessions.length === 0 ? (
          <p className="rounded-2xl bg-card border border-border p-6 text-sm text-muted-foreground text-center">
            No saved sessions yet. Finish a dhikr session and save it to see it here.
          </p>
        ) : (
          <ul className="rounded-2xl bg-card border border-border divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.id} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{s.dhikrTransliteration}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {s.count}
                    {s.target ? ` / ${s.target}` : ""}{" "}
                    {s.target ? (
                      <span className={s.completed ? "text-primary" : ""}>
                        {s.completed ? "· completed" : "· not completed"}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {humanDuration(s.durationMs)} · {averagePace(s.count, s.durationMs)}/min
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.endedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    ·{" "}
                    {new Date(s.endedAt).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    deleteSession(s.id);
                    refresh();
                  }}
                  className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label={`Delete session from ${new Date(s.endedAt).toLocaleString()}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {sessions.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Clear all session history? This cannot be undone.")) {
                clearSessions();
                refresh();
              }
            }}
            className="mt-2 rounded-xl bg-destructive/10 text-destructive py-3 font-medium flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Clear all history
          </button>
        )}

        <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
          History is stored only on this device and never uploaded.
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: boolean }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 text-center">
      <p className="text-lg font-semibold text-foreground tabular-nums inline-flex items-center gap-1">
        {icon && <Flame className="w-4 h-4 text-gold" />}
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
