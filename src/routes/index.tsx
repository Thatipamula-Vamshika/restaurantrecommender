import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ALLERGY_MAP, THEMES, recommend,
  type MemberPrefs, type Restaurant, type Theme,
} from "@/lib/recommend";
import { ALL_STATES, STATE_CITIES, stateForCity } from "@/lib/states";
import { photoFor, mapsLink, menuSearchLink } from "@/lib/restaurant-media";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CommunalTable — Anonymous group restaurant picks" },
      {
        name: "description",
        content:
          "Pass-the-device anonymous voting. Combine cuisine, budget and allergy inputs from a group and get the perfect restaurant — with photos, menus and directions.",
      },
      { property: "og:title", content: "CommunalTable" },
      {
        property: "og:description",
        content: "Anonymous collaboration for better dining.",
      },
    ],
  }),
  component: Page,
});

const SUGGESTED_CUISINES = [
  "North Indian", "South Indian", "Chinese", "Biryani", "Pizzas", "Italian",
  "Continental", "Fast Food", "Desserts", "Bakery", "Beverages", "Mughlai",
  "Punjabi", "Thalis", "Healthy Food", "Snacks", "Ice Cream", "Pastas",
];
const CUISINE_TILES: { label: string; emoji: string }[] = [
  { label: "North Indian", emoji: "🍛" },
  { label: "South Indian", emoji: "🥥" },
  { label: "Biryani", emoji: "🍚" },
  { label: "Chinese", emoji: "🥡" },
  { label: "Italian", emoji: "🍕" },
  { label: "Continental", emoji: "🥗" },
  { label: "Desserts", emoji: "🍰" },
  { label: "Beverages", emoji: "🥤" },
];
const ALLERGIES = Object.keys(ALLERGY_MAP);
const ALLERGY_META: Record<string, { emoji: string }> = {
  dairy: { emoji: "🥛" }, gluten: { emoji: "🌾" }, nuts: { emoji: "🥜" },
  seafood: { emoji: "🐟" }, egg: { emoji: "🥚" }, shellfish: { emoji: "🦐" },
};
const BUDGETS = [
  { v: 200, label: "₹", note: "Under ₹200" },
  { v: 500, label: "₹₹", note: "₹200–₹500" },
  { v: 1000, label: "₹₹₹", note: "₹500–₹1000" },
  { v: 2000, label: "₹₹₹₹", note: "₹1000+" },
];

type Stage = "intro" | "size" | "handover" | "collect" | "result";

function Page() {
  const [catalog, setCatalog] = useState<Restaurant[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("intro");

  const [occasion, setOccasion] = useState("");
  const [theme, setTheme] = useState<Theme>("casual");
  const [groupSize, setGroupSize] = useState(3);
  const [state, setState] = useState<string>("");
  const [city, setCity] = useState("");
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");

  const [currentMember, setCurrentMember] = useState(0);
  const [members, setMembers] = useState<MemberPrefs[]>([]);
  const [draft, setDraft] = useState<MemberPrefs>(emptyPrefs());

  useEffect(() => {
    fetch("/restaurants.json")
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => setLoadErr("Failed to load restaurant data"));
  }, []);

  const cityOptions = useMemo(() => {
    if (!state) return [];
    return STATE_CITIES[state] ?? [];
  }, [state]);

  const recs = useMemo(() => {
    if (stage !== "result" || !catalog) return [];
    const cityList = state && !city ? STATE_CITIES[state] : undefined;
    return recommend(catalog, members, theme, city || undefined, cityList);
  }, [stage, catalog, members, theme, city, state]);

  const detectLocation = () => {
    if (!navigator.geolocation) { setLocStatus("err"); return; }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: "application/json" } },
          );
          const data = await res.json();
          const a = data.address || {};
          const detectedState = a.state as string | undefined;
          const detectedCity =
            a.city || a.town || a.village || a.suburb || a.county || "";
          if (detectedState && ALL_STATES.includes(detectedState)) {
            setState(detectedState);
          } else if (detectedCity) {
            const guess = stateForCity(detectedCity);
            if (guess) setState(guess);
          }
          if (detectedCity) setCity(detectedCity);
          setLocStatus(detectedState || detectedCity ? "ok" : "err");
        } catch { setLocStatus("err"); }
      },
      () => setLocStatus("err"),
      { timeout: 10000 },
    );
  };

  const startGroup = () => {
    if (!state) return;
    setMembers([]);
    setCurrentMember(0);
    setDraft(emptyPrefs());
    setStage("handover");
  };

  const submitMember = () => {
    if (!draft.cuisines.length) return;
    const next = [...members, draft];
    setMembers(next);
    setDraft(emptyPrefs());
    if (next.length >= groupSize) setStage("result");
    else { setCurrentMember((i) => i + 1); setStage("handover"); }
  };

  const reset = () => {
    setStage("intro"); setMembers([]); setCurrentMember(0);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader onStart={() => document.getElementById("start-card")?.scrollIntoView({ behavior: "smooth" })} />

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        {loadErr && <p className="text-destructive">{loadErr}</p>}
        {!catalog && !loadErr && (
          <p className="text-muted-foreground">Loading restaurants…</p>
        )}

        {catalog && stage === "intro" && (
          <IntroView
            occasion={occasion} setOccasion={setOccasion}
            theme={theme} setTheme={setTheme}
            groupSize={groupSize} setGroupSize={setGroupSize}
            state={state} setState={setState}
            city={city} setCity={setCity}
            cityOptions={cityOptions}
            locStatus={locStatus} detect={detectLocation}
            onStart={startGroup}
          />
        )}

        {catalog && stage === "handover" && (
          <HandoverView index={currentMember} total={groupSize}
            onReady={() => setStage("collect")} />
        )}

        {catalog && stage === "collect" && (
          <CollectView index={currentMember} total={groupSize}
            draft={draft} setDraft={setDraft}
            onSubmit={submitMember}
            occasion={occasion} state={state} city={city}
            membersDone={members.length}
          />
        )}

        {catalog && stage === "result" && (
          <ResultView recs={recs} theme={theme}
            place={city || state} memberCount={members.length} onReset={reset} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function emptyPrefs(): MemberPrefs {
  return { cuisines: [], budgetMax: 1000, allergies: [] };
}

/* ============ Header / Footer ============ */
function SiteHeader({ onStart }: { onStart: () => void }) {
  return (
    <header className="border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-primary">
          <span className="text-xl">🍽️</span> CommunalTable
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-foreground/80 sm:flex">
          <a href="#how" className="border-b-2 border-primary pb-0.5 text-primary">How it Works</a>
          <a href="#philosophy" className="hover:text-foreground">Our Philosophy</a>
          <a href="#support" className="hover:text-foreground">Support</a>
        </nav>
        <Button onClick={onStart} className="rounded-md bg-primary px-5 text-primary-foreground hover:bg-primary/90">
          Start Group
        </Button>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-xs text-muted-foreground sm:px-8">
        <span className="font-semibold text-primary">CommunalTable</span>
        <span>© 2026 CommunalTable. Anonymous collaboration for better dining.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">Contact</a>
        </div>
      </div>
    </footer>
  );
}

/* ============ Intro / Landing ============ */
function IntroView(props: {
  occasion: string; setOccasion: (s: string) => void;
  theme: Theme; setTheme: (t: Theme) => void;
  groupSize: number; setGroupSize: (n: number) => void;
  state: string; setState: (s: string) => void;
  city: string; setCity: (s: string) => void;
  cityOptions: string[];
  locStatus: "idle" | "loading" | "ok" | "err";
  detect: () => void;
  onStart: () => void;
}) {
  const { occasion, setOccasion, theme, setTheme, groupSize, setGroupSize,
    state, setState, city, setCity, cityOptions, locStatus, detect, onStart } = props;

  return (
    <div className="space-y-20">
      {/* HERO */}
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h1 className="font-serif text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Great meals start with a <span className="text-primary">collective spark.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
            Gather your friends, family, or colleagues for a seamless dining decision. No accounts, no passwords — just shared appetites.
          </p>

          <div id="start-card" className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h3 className="font-semibold">Start a Group</h3>

            <div className="mt-4">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">What's the occasion?</Label>
              <Input value={occasion} onChange={(e) => setOccasion(e.target.value)}
                placeholder="e.g., Saturday Night Pizza Party"
                className="mt-1.5 h-11 bg-secondary" />
            </div>

            <div className="mt-4">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Group Theme</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button key={t.id} onClick={() => setTheme(t.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      theme === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground/80 hover:border-primary/40"
                    }`}>
                    <span className="mr-1">{t.emoji}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Group size</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setGroupSize(Math.max(2, groupSize - 1))}>−</Button>
                  <div className="grid h-10 flex-1 place-items-center rounded-md border border-border bg-secondary text-lg font-semibold">{groupSize}</div>
                  <Button variant="outline" size="icon" onClick={() => setGroupSize(Math.min(12, groupSize + 1))}>+</Button>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">State</Label>
                <Select value={state} onValueChange={(v) => { setState(v); setCity(""); }}>
                  <SelectTrigger className="mt-1.5 h-10 bg-secondary"><SelectValue placeholder="Select your state" /></SelectTrigger>
                  <SelectContent>
                    {ALL_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">City (optional)</Label>
                <Select value={city} onValueChange={setCity} disabled={!state}>
                  <SelectTrigger className="mt-1.5 h-10 bg-secondary">
                    <SelectValue placeholder={state ? "Any city in state" : "Pick state first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cityOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <button type="button" onClick={detect}
                className="mt-[22px] flex h-10 items-center justify-center gap-2 rounded-md border border-dashed border-primary/50 bg-primary/5 px-3 text-sm font-medium text-primary transition hover:bg-primary/10">
                <span>📍</span>
                {locStatus === "loading" ? "Detecting…"
                  : locStatus === "ok" ? "Location set"
                  : locStatus === "err" ? "Try again"
                  : "Auto-detect my location"}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.92_0.07_145)] px-2.5 py-1 text-[oklch(0.35_0.1_150)]">
                👥 Anonymous
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.92_0.09_90)] px-2.5 py-1 text-[oklch(0.4_0.1_80)]">
                ⚡ Instant Join
              </span>
            </div>

            <Button size="lg" onClick={onStart} disabled={!state}
              className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Start Group →
            </Button>
            {!state && <p className="mt-2 text-center text-xs text-muted-foreground">Pick a state (or auto-detect) to continue.</p>}
          </div>
        </div>

        {/* Tilted hero photo + floating badge */}
        <div className="relative">
          <div className="rotate-2 overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-warm)]">
            <img
              src={photoFor(7777, 1200)}
              alt="Group sharing a meal"
              className="h-[420px] w-full object-cover sm:h-[520px]"
              loading="eager"
            />
          </div>
          <div className="absolute -bottom-4 -left-3 -rotate-3 rounded-xl bg-[oklch(0.42_0.07_150)] px-4 py-2.5 text-white shadow-[var(--shadow-warm)]">
            <div className="text-lg font-bold leading-tight">{Math.floor(Math.random() * 9) + 4} active tables</div>
            <div className="text-xs opacity-90">in {state || "your area"}</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="space-y-6">
        <div>
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">The simple way to decide.</h2>
          <p className="text-muted-foreground">Three steps from craving to the first bite.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Tile color="warm" emoji="🔗" title="No accounts, just links."
            body="Once you start a group, share the device with everyone. They join instantly — no registration, just collaboration." />
          <Tile color="yellow" emoji="📊" title="Anonymous Voting"
            body="Everyone votes for their favorite cuisines, budget, or specific cafes — without any social pressure." />
          <Tile color="green" emoji="🍴" title="Smart Discovery"
            body="We suggest local gems based on your group's collective preferences and budget." />
          <Tile color="warm" emoji="🛡️" title="Allergy-safe"
            body="Any allergy from any member excludes risky restaurants for the whole group." className="lg:col-span-2" />
          <Tile color="green" emoji="✨" title="Consensus reached."
            body="Our algorithm finds the 'sweet spot' where everyone's happy, making the final choice effortless." />
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section id="philosophy" className="rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)] sm:p-12">
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">Collective clarity for better dining.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          We believe the best decisions are made when everyone has a seat at the table. Our anonymous process removes bias and speeds up the "where should we eat?" debate.
        </p>
      </section>
    </div>
  );
}

function Tile({ color, emoji, title, body, className = "" }: {
  color: "warm" | "yellow" | "green"; emoji: string; title: string; body: string; className?: string;
}) {
  const bg = color === "yellow" ? "bg-[oklch(0.92_0.09_90)]"
           : color === "green" ? "bg-[oklch(0.92_0.07_145)]"
           : "bg-[oklch(0.93_0.04_50)]";
  return (
    <div className={`rounded-2xl ${bg} p-6 ${className}`}>
      <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-lg text-primary-foreground">{emoji}</div>
      <div className="mt-4 text-lg font-semibold">{title}</div>
      <p className="mt-1.5 text-sm text-foreground/70">{body}</p>
    </div>
  );
}

/* ============ Handover ============ */
function HandoverView({ index, total, onReady }: { index: number; total: number; onReady: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-10 text-center shadow-[var(--shadow-warm)]">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary text-3xl text-primary-foreground">🤝</div>
      <p className="mt-5 text-sm uppercase tracking-wide text-muted-foreground">Person {index + 1} of {total}</p>
      <h2 className="mt-1 font-serif text-3xl font-bold">Pass the device</h2>
      <p className="mt-3 text-muted-foreground">
        Hand the phone to the next person. Their answers stay private — nobody else sees what they pick.
      </p>
      <Button size="lg" className="mt-6 w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={onReady}>
        I'm ready — show me my page
      </Button>
    </div>
  );
}

/* ============ Collect (per person) — mirrors mockup ============ */
function CollectView({
  index, total, draft, setDraft, onSubmit, occasion, state, city, membersDone,
}: {
  index: number; total: number;
  draft: MemberPrefs; setDraft: (p: MemberPrefs) => void;
  onSubmit: () => void;
  occasion: string; state: string; city: string; membersDone: number;
}) {
  const [typed, setTyped] = useState("");
  const addCuisine = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (draft.cuisines.some((c) => c.toLowerCase() === v.toLowerCase())) return;
    setDraft({ ...draft, cuisines: [...draft.cuisines, v] });
    setTyped("");
  };
  const removeCuisine = (c: string) =>
    setDraft({ ...draft, cuisines: draft.cuisines.filter((x) => x !== c) });
  const toggleAllergy = (a: string) =>
    setDraft({
      ...draft,
      allergies: draft.allergies.includes(a)
        ? draft.allergies.filter((x) => x !== a)
        : [...draft.allergies, a],
    });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Person {index + 1} of {total} · Anonymous</p>
        <h1 className="mt-1 font-serif text-4xl font-bold tracking-tight">Table Preferences</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Help your group find the perfect spot{occasion ? ` for "${occasion}"` : ""}. Your preferences remain anonymous to other members until the final selection is revealed.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="space-y-5">
          {/* Cuisine grid */}
          <Section title="Cuisine Style" icon="🍽️">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CUISINE_TILES.map((t) => {
                const on = draft.cuisines.includes(t.label);
                return (
                  <button key={t.label}
                    onClick={() => on ? removeCuisine(t.label) : addCuisine(t.label)}
                    className={`group rounded-xl border p-4 text-center transition ${
                      on ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                    }`}>
                    <div className="text-2xl">{t.emoji}</div>
                    <div className="mt-2 text-sm font-medium">{t.label}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={typed} onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCuisine(typed); } }}
                placeholder="Other — type a cuisine and press Enter"
                className="h-10 bg-secondary" />
              <Button onClick={() => addCuisine(typed)} disabled={!typed.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90">Add</Button>
            </div>
            {draft.cuisines.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.cuisines.map((c) => (
                  <button key={c} onClick={() => removeCuisine(c)}
                    className="group flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground">
                    {c} <span className="opacity-70 group-hover:opacity-100">✕</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3">
              <p className="mb-1.5 text-xs text-muted-foreground">Suggestions:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_CUISINES.filter((c) => !draft.cuisines.includes(c) && !CUISINE_TILES.some((t) => t.label === c)).slice(0, 12).map((c) => (
                  <button key={c} onClick={() => addCuisine(c)}
                    className="rounded-full border border-border px-2.5 py-1 text-xs hover:border-primary/40">+ {c}</button>
                ))}
              </div>
            </div>
          </Section>

          {/* Budget */}
          <Section title="Budget Range" icon="💵">
            <div className="flex flex-wrap gap-2">
              {BUDGETS.map((b) => {
                const on = draft.budgetMax === b.v;
                return (
                  <button key={b.v} onClick={() => setDraft({ ...draft, budgetMax: b.v })}
                    className={`rounded-full border px-5 py-2 text-base font-semibold transition ${
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
                    }`}>{b.label}</button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Suggested: {BUDGETS.find((b) => b.v === draft.budgetMax)?.note} per person
            </p>
          </Section>
        </div>

        {/* RIGHT sidebar */}
        <div className="space-y-5">
          <Section title="Location" icon="📍">
            <div className="overflow-hidden rounded-lg bg-[oklch(0.93_0.01_75)] p-6 text-center">
              <div className="text-2xl">🗺️</div>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-sm font-medium text-primary">
                📍 {city || state || "Anywhere"}
              </div>
            </div>
          </Section>

          <Section title="Dietary & Allergies" icon="⚠️">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Common Allergies</p>
            <div className="grid grid-cols-2 gap-2">
              {ALLERGIES.map((a) => {
                const on = draft.allergies.includes(a);
                return (
                  <button key={a} onClick={() => toggleAllergy(a)}
                    className={`rounded-lg border p-3 text-center text-sm capitalize transition ${
                      on ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-card hover:border-primary/40"
                    }`}>
                    <div className="text-lg">{ALLERGY_META[a]?.emoji ?? "•"}</div>
                    <div className="mt-1 font-medium">{a}</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Restaurants matching any allergy will be excluded for the whole group.
            </p>
          </Section>

          <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-[var(--shadow-warm)]">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Group Status</p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-foreground/20 text-xs font-bold">✓</span>
              {membersDone} submitted preferences
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm opacity-90">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-primary-foreground/50 text-xs">⏳</span>
              Waiting for {total - membersDone - 1} others…
            </div>
            <Button size="lg" disabled={!draft.cuisines.length} onClick={onSubmit}
              className="mt-4 w-full bg-card text-primary hover:bg-card/90">
              Submit My Preferences
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ============ Result ============ */
function ResultView({
  recs, theme, place, memberCount, onReset,
}: {
  recs: Restaurant[]; theme: Theme; place: string; memberCount: number; onReset: () => void;
}) {
  const themeMeta = THEMES.find((t) => t.id === theme)!;
  const top = recs[0];
  const alts = recs.slice(1, 3);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.92_0.07_145)] px-3.5 py-1.5 text-sm font-semibold text-[oklch(0.35_0.1_150)]">
          🎉 Decision Reached!
        </span>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight sm:text-5xl">
          Your group's perfect picks!
        </h1>
        <p className="mt-2 text-muted-foreground">
          {memberCount} anonymous votes · {themeMeta.emoji} {themeMeta.label} · 📍 {place}
        </p>
      </div>

      {recs.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          No restaurants matched everyone's constraints in <b>{place}</b>. Try loosening allergies, raising budget, or another area.
        </div>
      )}

      {top && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* #1 FINAL PICK */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-warm)]">
            <div className="grid sm:grid-cols-2">
              <img src={photoFor(top.i, 900)} alt={top.n}
                className="h-64 w-full object-cover sm:h-full" loading="lazy" />
              <div className="space-y-3 p-6">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[oklch(0.92_0.07_145)] px-2.5 py-1 text-xs font-semibold text-[oklch(0.35_0.1_150)]">Best Match</span>
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">⭐ #1 FINAL PICK</span>
                </div>
                <h3 className="font-serif text-2xl font-bold">{top.n}</h3>
                <p className="text-sm text-muted-foreground">{top.q.slice(0, 3).join(" • ")}</p>
                <div className="rounded-xl bg-secondary p-3 text-sm">
                  <p className="font-semibold">Why it was chosen</p>
                  <p className="mt-1 text-foreground/75">
                    Matches {memberCount}/{memberCount} members' budgets, scores high on the group's preferred cuisines, and rates ⭐ {top.r} from diners.
                  </p>
                </div>
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground"><span>📍</span><span>{top.a || top.c}</span></p>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Price for two</p>
                    <p className="text-lg font-bold">₹{top.p}</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={menuSearchLink(top.n, top.c)} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent">
                      📖 View Menu
                    </a>
                    <a href={mapsLink(top.n, top.a || top.c)} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                      🗺️ Directions
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alternatives */}
          <div className="space-y-4">
            <h3 className="font-serif text-xl font-bold">Top Alternatives</h3>
            {alts.map((r, i) => (
              <div key={r.i} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
                <div className="relative">
                  <img src={photoFor(r.i, 700)} alt={r.n}
                    className="h-36 w-full object-cover" loading="lazy" />
                  <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold backdrop-blur">#{i + 2} Option</span>
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-semibold">{r.n}</h4>
                    <span className="text-sm font-bold text-primary">⭐ {r.r}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.q.slice(0, 3).join(" • ")} · ₹{r.p} for two</p>
                  <p className="flex items-start gap-1 text-xs text-muted-foreground"><span>📍</span><span className="line-clamp-2">{r.a || r.c}</span></p>
                  <div className="flex gap-2 pt-1">
                    <a href={mapsLink(r.n, r.a || r.c)} target="_blank" rel="noreferrer"
                      className="flex-1 rounded-md bg-primary py-1.5 text-center text-xs font-semibold text-primary-foreground hover:bg-primary/90">Directions</a>
                    <a href={menuSearchLink(r.n, r.c)} target="_blank" rel="noreferrer"
                      className="flex-1 rounded-md border border-border py-1.5 text-center text-xs font-semibold hover:bg-accent">Menu</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <Button variant="outline" size="lg" onClick={onReset}>Start a new group</Button>
      </div>
    </div>
  );
}
