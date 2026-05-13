import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSession, getSessionByCode, listSubmissions, deleteSession, type SessionRow } from "@/lib/session";
import { recommend, THEMES, type Restaurant, type ScoredPick, type Theme } from "@/lib/recommend";
import { supabase } from "@/integrations/supabase/client";
import { photoFor, mapsLink } from "@/lib/restaurant-media";

export const Route = createFileRoute("/host/$code")({
  head: () => ({ meta: [{ title: "Host a remote group — CommunalTable" }] }),
  component: HostPage,
});

function HostPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [theme, setTheme] = useState<Theme>("casual");
  const [city, setCity] = useState("");
  const [expectedSize, setExpectedSize] = useState(4);
  const [creating, setCreating] = useState(false);
  const [count, setCount] = useState(0);
  const [picks, setPicks] = useState<ScoredPick[] | null>(null);
  const [busy, setBusy] = useState(false);

  // If URL has a code != "new", load that session.
  useEffect(() => {
    if (code === "new") return;
    getSessionByCode(code).then((s) => s && setSession(s));
  }, [code]);

  // Realtime subscribe to submissions count
  useEffect(() => {
    if (!session) return;
    const refresh = async () => {
      const subs = await listSubmissions(session.id);
      setCount(subs.length);
    };
    refresh();
    const channel = supabase.channel(`session-${session.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "group_submissions", filter: `session_id=eq.${session.id}` },
        () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const create = async () => {
    setCreating(true);
    try {
      const s = await createSession({ theme, city: city || undefined, expectedSize });
      setSession(s);
      navigate({ to: "/host/$code", params: { code: s.code }, replace: true });
    } finally { setCreating(false); }
  };

  const generate = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const subs = await listSubmissions(session.id);
      const catalog: Restaurant[] = await fetch("/restaurants.json").then((r) => r.json());
      const cityDefaults = await fetch("/city-defaults.json").then((r) => r.json()).catch(() => ({}));
      const result = recommend(catalog, subs, session.theme as Theme, session.city ?? undefined, undefined, undefined, cityDefaults);
      setPicks(result.picks);
      await deleteSession(session.id);
    } finally { setBusy(false); }
  };

  if (!session && code === "new") {
    return (
      <Shell>
        <h1 className="font-serif text-3xl font-bold">Create a remote group</h1>
        <p className="mt-2 text-muted-foreground">We'll generate a 6-character code. Share it with friends — they submit anonymously from their own phones.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Vibe</Label>
            <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm">
              {THEMES.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">City (optional)</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bangalore" className="mt-1.5 bg-secondary" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Expected group size</Label>
            <Input type="number" min={2} max={20} value={expectedSize}
              onChange={(e) => setExpectedSize(Math.max(2, Math.min(20, Number(e.target.value) || 4)))}
              className="mt-1.5 bg-secondary" />
          </div>
        </div>
        <Button onClick={create} disabled={creating}
          className="mt-6 rounded-full bg-primary px-7 text-primary-foreground hover:bg-primary/90">
          {creating ? "Creating…" : "Create code →"}
        </Button>
      </Shell>
    );
  }

  if (!session) {
    return <Shell><p className="text-muted-foreground">Loading session…</p></Shell>;
  }

  if (picks) {
    return (
      <Shell>
        <h1 className="font-serif text-3xl font-bold">Your group chose</h1>
        <p className="mt-1 text-muted-foreground">{count} anonymous submissions · session deleted.</p>
        {picks.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No matches — try again with broader prefs.</p>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {picks.map((p) => (
              <div key={p.r.i} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
                <div className="relative">
                  <img src={photoFor(p.r.i, 800, p.r.q)} alt={p.r.n} className="h-40 w-full object-cover" />
                  <span className="absolute right-2 top-2 rounded-full bg-card/90 px-2.5 py-0.5 text-xs font-bold text-primary">★ {p.r.r.toFixed(1)}</span>
                  <span className="absolute bottom-2 right-2 rounded-full bg-[oklch(0.55_0.16_150)] px-2.5 py-0.5 text-xs font-bold text-white">Score {p.score}%</span>
                </div>
                <div className="p-4">
                  <div className="font-serif text-lg font-bold">{p.r.n}</div>
                  <p className="text-xs text-muted-foreground">{p.r.c}</p>
                  <a href={mapsLink(p.r.n, p.r.a)} target="_blank" rel="noreferrer"
                    className="mt-2 inline-block text-xs text-primary hover:underline">🗺️ Directions →</a>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link to="/" className="mt-6 inline-block text-sm text-primary hover:underline">← Back home</Link>
      </Shell>
    );
  }

  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${session.code}` : `/join/${session.code}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(joinUrl)}`;

  return (
    <Shell>
      <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-xs uppercase tracking-wider text-primary">Remote group</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Share this code</h1>
          <div className="mt-4 inline-block rounded-2xl border-2 border-primary/40 bg-card px-6 py-4 shadow-[var(--shadow-warm)]">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Code</p>
            <p className="font-mono text-5xl font-bold tracking-[0.2em] text-primary">{session.code}</p>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Friends open <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{joinUrl}</code> or scan the QR.
          </p>
          <div className="mt-6 rounded-2xl bg-secondary p-5">
            <p className="text-sm font-semibold">{count} of {session.expected_size} joined</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-card">
              <div className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (count / session.expected_size) * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Their answers are never shown — only the final pick.</p>
          </div>
          <Button size="lg" onClick={generate} disabled={busy || count === 0}
            className="mt-6 rounded-full bg-primary px-7 text-primary-foreground hover:bg-primary/90">
            {busy ? "Generating…" : "Generate recommendation →"}
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <img src={qrSrc} alt="Join QR code" className="rounded-xl" />
          <p className="mt-3 text-xs text-muted-foreground">Scan to join from any phone</p>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
