import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { DHIKR_LIST } from "@/lib/dhikr/data";
import { deleteAllProfiles, deleteProfile, loadProfile } from "@/lib/dhikr/storage";
import { ArrowLeft, Trash2 } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Voice Profile — Dhikr Counter" },
      {
        name: "description",
        content: "Manage your local dhikr voice profiles. Nothing leaves your device.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const router = useRouter();
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 max-w-md mx-auto w-full">
        <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-secondary" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Voice Profile</h1>
      </header>

      <main className="max-w-md mx-auto w-full px-5 pb-12 flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Your voice profile is stored only on this device. Raw recordings are never saved.
        </p>

        <div className="rounded-2xl bg-card border border-border divide-y divide-border">
          {DHIKR_LIST.map((d) => {
            const p = loadProfile(d.id);
            const cal = !!p && p.samples.length >= 5;
            return (
              <div key={d.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-arabic text-xl text-foreground" lang="ar">
                    {d.arabic}
                  </p>
                  <p className="text-sm font-medium text-foreground">{d.transliteration}</p>
                  <p
                    className={`text-xs mt-1 ${cal ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {cal ? "Calibrated" : "Not calibrated"}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Link
                    to="/calibrate/$id"
                    params={{ id: d.id }}
                    className="text-sm text-primary font-medium"
                  >
                    {cal ? "Recalibrate" : "Calibrate"}
                  </Link>
                  {cal && (
                    <button
                      onClick={() => {
                        deleteProfile(d.id);
                        refresh();
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            if (confirm("Delete all voice profiles? You'll need to calibrate again.")) {
              deleteAllProfiles();
              refresh();
              router.invalidate();
            }
          }}
          className="mt-4 rounded-xl bg-destructive/10 text-destructive py-3 font-medium flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Delete My Voice Profile
        </button>

        <div className="mt-6 rounded-2xl bg-secondary/60 p-4 text-xs text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground mb-1">Privacy</p>
          Voice calibration data lives on this device in your browser storage. Voice
          recognition uses your browser's built-in speech engine. No account is required and
          no raw audio is uploaded or stored by this app.
        </div>
      </main>
    </div>
  );
}
