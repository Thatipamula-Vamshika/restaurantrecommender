import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSessionByCode, submitToSession, type SessionRow } from "@/lib/session";
import { ALLERGY_MAP } from "@/lib/recommend";

const SUGGESTED = ["North Indian", "South Indian", "Chinese", "Biryani", "Pizzas", "Italian", "Continental", "Fast Food", "Desserts", "Cafe"];
const ALLERGIES = Object.keys(ALLERGY_MAP);

export const Route = createFileRoute("/join/$code")({
  head: () => ({ meta: [{ title: "Join group — CommunalTable" }] }),
  component: JoinPage,
});

function JoinPage() {
  const { code } = Route.useParams();
  const [session, setSession] = useState<SessionRow | null | "missing">(null);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [budget, setBudget] = useState("600");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSessionByCode(code).then((s) => setSession(s ?? "missing"));
  }, [code]);

  const add = (v: string) => {
    const t = v.trim();
    if (!t || cuisines.some((c) => c.toLowerCase() === t.toLowerCase())) return;
    setCuisines([...cuisines, t]); setTyped("");
  };
  const submit = async () => {
    if (!session || session === "missing" || !cuisines.length) return;
    setBusy(true);
    try {
      await submitToSession(session.id, {
        cuisines, allergies, budgetMax: Math.max(50, Math.min(10000, Number(budget) || 600)),
      });
      setDone(true);
    } finally { setBusy(false); }
  };

  if (session === null) {
    return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  }
  if (session === "missing") {
    return (
      <Shell>
        <h1 className="font-serif text-3xl font-bold">Code not found</h1>
        <p className="mt-2 text-muted-foreground">Double-check the 6-character code.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Go home</Link>
      </Shell>
    );
  }
  if (done) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-warm)]">
          <div className="text-5xl">✅</div>
          <h1 className="mt-3 font-serif text-3xl font-bold">Submitted anonymously</h1>
          <p className="mt-2 text-muted-foreground">Wait for the host to generate the pick. Nothing you typed is shown to anyone.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        🔒 Anonymous · Code {session.code}
      </span>
      <h1 className="mt-2 font-serif text-3xl font-bold">Your preferences</h1>
      <p className="mt-1 text-muted-foreground">
        {session.city ? `Group is searching in ${session.city}.` : "Submit silently — only the final pick is shared."}
      </p>

      <div className="mt-6 space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <Label className="text-sm font-semibold">🍽️ Cuisines you'd love</Label>
          <div className="mt-2 flex gap-2">
            <Input value={typed} onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(typed); } }}
              placeholder="Type and press Enter" className="bg-secondary" />
            <Button onClick={() => add(typed)} disabled={!typed.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90">Add</Button>
          </div>
          {cuisines.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {cuisines.map((c) => (
                <button key={c} onClick={() => setCuisines(cuisines.filter((x) => x !== c))}
                  className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">{c} ✕</button>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTED.filter((c) => !cuisines.includes(c)).map((c) => (
              <button key={c} onClick={() => add(c)} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs hover:border-primary/40">+ {c}</button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <Label className="text-sm font-semibold">💵 Your max budget per person (₹)</Label>
          <Input type="number" min={50} max={10000} value={budget} onChange={(e) => setBudget(e.target.value)}
            className="mt-2 w-40 bg-secondary text-lg font-semibold" />
          <p className="mt-1.5 text-xs text-muted-foreground">Never shown to the group — only used to keep the pick affordable.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <Label className="text-sm font-semibold">⚠️ Allergies</Label>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ALLERGIES.map((a) => {
              const on = allergies.includes(a);
              return (
                <button key={a} onClick={() => setAllergies(on ? allergies.filter((x) => x !== a) : [...allergies, a])}
                  className={`rounded-lg border p-2 text-center text-xs capitalize ${on ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-card hover:border-primary/40"}`}>
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        <Button size="lg" onClick={submit} disabled={busy || !cuisines.length}
          className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
          {busy ? "Submitting…" : "Submit anonymously →"}
        </Button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
