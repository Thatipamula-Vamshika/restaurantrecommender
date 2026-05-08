import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ALLERGY_MAP,
  THEMES,
  recommend,
  type MemberPrefs,
  type Restaurant,
  type Theme,
} from "@/lib/recommend";
import { photoFor, mapsLink, menuSearchLink } from "@/lib/restaurant-media";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GroupBite — Anonymous restaurant picker for groups" },
      {
        name: "description",
        content:
          "Collect cuisine, budget & allergy inputs anonymously and get top 3 nearby restaurants with photos, menu links and directions.",
      },
      { property: "og:title", content: "GroupBite — Anonymous restaurant picker" },
      {
        property: "og:description",
        content: "Pass-the-device dining decisions, allergy-safe and location-aware.",
      },
    ],
  }),
  component: Page,
});

const SUGGESTED_CUISINES = [
  "North Indian","South Indian","Chinese","Biryani","Pizzas","Italian",
  "Continental","Fast Food","Desserts","Bakery","Beverages","Mughlai",
  "Punjabi","Thalis","Healthy Food","Snacks","Ice Cream","Pastas",
];
const ALLERGIES = Object.keys(ALLERGY_MAP);
const BUDGETS = [200, 400, 700, 1200, 2000];

type Stage =
  | "intro"
  | "size"
  | "theme"
  | "location"
  | "handover"
  | "collect"
  | "result";

function Page() {
  const [catalog, setCatalog] = useState<Restaurant[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("intro");
  const [groupSize, setGroupSize] = useState(3);
  const [theme, setTheme] = useState<Theme>("casual");
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

  const cities = useMemo(() => {
    if (!catalog) return [];
    const s = new Set<string>();
    catalog.forEach((r) => r.c && s.add(r.c.split(",").pop()!.trim()));
    return Array.from(s).sort();
  }, [catalog]);

  const recs = useMemo(() => {
    if (stage !== "result" || !catalog) return [];
    return recommend(catalog, members, theme, city);
  }, [stage, catalog, members, theme, city]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus("err");
      return;
    }
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
          const detected =
            a.city || a.town || a.village || a.suburb || a.state_district || a.state || "";
          if (detected) {
            setCity(detected);
            setLocStatus("ok");
          } else {
            setLocStatus("err");
          }
        } catch {
          setLocStatus("err");
        }
      },
      () => setLocStatus("err"),
      { timeout: 10000 },
    );
  };

  const startCollect = () => {
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
    else {
      setCurrentMember((i) => i + 1);
      setStage("handover");
    }
  };

  const reset = () => {
    setStage("intro");
    setMembers([]);
    setCurrentMember(0);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button onClick={reset} className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-warm)] text-white shadow-[var(--shadow-warm)]">
              <span className="text-lg">🍽️</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">GroupBite</h1>
          </button>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Anonymous · Allergy-safe · Location-aware
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {loadErr && <p className="text-destructive">{loadErr}</p>}
        {!catalog && !loadErr && (
          <p className="text-muted-foreground">Loading 60k+ restaurants…</p>
        )}

        {catalog && stage === "intro" && (
          <IntroView onStart={() => setStage("size")} />
        )}

        {catalog && stage === "size" && (
          <SizeView
            groupSize={groupSize}
            setGroupSize={setGroupSize}
            onNext={() => setStage("theme")}
          />
        )}

        {catalog && stage === "theme" && (
          <ThemeView
            theme={theme}
            setTheme={setTheme}
            onBack={() => setStage("size")}
            onNext={() => setStage("location")}
          />
        )}

        {catalog && stage === "location" && (
          <LocationView
            city={city}
            setCity={setCity}
            cities={cities}
            locStatus={locStatus}
            detect={detectLocation}
            onBack={() => setStage("theme")}
            onNext={startCollect}
          />
        )}

        {catalog && stage === "handover" && (
          <HandoverView
            index={currentMember}
            total={groupSize}
            onReady={() => setStage("collect")}
          />
        )}

        {catalog && stage === "collect" && (
          <CollectView
            index={currentMember}
            total={groupSize}
            draft={draft}
            setDraft={setDraft}
            onSubmit={submitMember}
          />
        )}

        {catalog && stage === "result" && (
          <ResultView
            recs={recs}
            theme={theme}
            city={city}
            memberCount={members.length}
            onReset={reset}
          />
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        No accounts · No tracking · Inputs stay on this device
      </footer>
    </div>
  );
}

function emptyPrefs(): MemberPrefs {
  return { cuisines: [], budgetMax: 700, allergies: [] };
}

/* ---------------- Intro ---------------- */
function IntroView({ onStart }: { onStart: () => void }) {
  const heroPhotos = [101, 202, 303, 404, 505, 606].map((s) => photoFor(s, 600));
  return (
    <div className="space-y-10">
      <div
        className="relative overflow-hidden rounded-3xl border border-border/60 p-8 sm:p-12"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div className="relative z-10 max-w-xl">
          <Badge className="bg-foreground text-background">No login · 100% anonymous</Badge>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Where should the <span className="text-[oklch(0.6_0.2_30)]">group</span> eat tonight?
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Pass the device around. Everyone enters preferences privately. We balance cuisines,
            budgets and allergies — then suggest the top 3 spots near you with photos, menus &
            directions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={onStart} className="bg-foreground text-background hover:bg-foreground/90">
              Start →
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>⚡</span>
              <span>Takes ~30 seconds per person</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {heroPhotos.map((src, i) => (
          <div
            key={i}
            className="aspect-square overflow-hidden rounded-2xl shadow-[var(--shadow-soft)]"
          >
            <img
              src={src}
              alt="Restaurant dish"
              loading="lazy"
              className="h-full w-full object-cover transition hover:scale-110"
            />
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { e: "🕵️", t: "Anonymous", d: "Each person enters input on their own page. Nobody sees others' choices." },
          { e: "🛡️", t: "Allergy-safe", d: "Any allergy from any member excludes risky restaurants for the whole group." },
          { e: "📍", t: "Near you", d: "Use your location to find places in your city or pick one yourself." },
        ].map((f) => (
          <Card key={f.t} className="p-5">
            <div className="text-2xl">{f.e}</div>
            <div className="mt-2 font-semibold">{f.t}</div>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Step: Group size ---------------- */
function SizeView({
  groupSize,
  setGroupSize,
  onNext,
}: {
  groupSize: number;
  setGroupSize: (n: number) => void;
  onNext: () => void;
}) {
  return (
    <StepCard step={1} total={3} title="How many people are eating?" subtitle="We'll collect input from each person, one at a time.">
      <div className="flex items-center justify-center gap-6 py-4">
        <Button variant="outline" size="icon" className="h-14 w-14 text-2xl" onClick={() => setGroupSize(Math.max(2, groupSize - 1))}>−</Button>
        <div className="grid place-items-center">
          <div className="text-7xl font-bold tracking-tight">{groupSize}</div>
          <div className="text-sm text-muted-foreground">people</div>
        </div>
        <Button variant="outline" size="icon" className="h-14 w-14 text-2xl" onClick={() => setGroupSize(Math.min(12, groupSize + 1))}>+</Button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {[2, 3, 4, 5, 6, 8].map((n) => (
          <button
            key={n}
            onClick={() => setGroupSize(n)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              groupSize === n ? "border-transparent bg-foreground text-background" : "border-border hover:border-foreground/40"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <Button size="lg" className="mt-4 w-full" onClick={onNext}>Continue →</Button>
    </StepCard>
  );
}

/* ---------------- Step: Theme ---------------- */
function ThemeView({
  theme,
  setTheme,
  onBack,
  onNext,
}: {
  theme: Theme;
  setTheme: (t: Theme) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <StepCard step={2} total={3} title="What's the vibe?" subtitle="Used to bias picks toward the right type of place.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`rounded-2xl border p-5 text-left transition ${
              theme === t.id
                ? "border-transparent bg-[image:var(--gradient-warm)] text-white shadow-[var(--shadow-warm)]"
                : "border-border hover:border-foreground/30"
            }`}
          >
            <div className="text-3xl">{t.emoji}</div>
            <div className="mt-2 text-sm font-medium">{t.label}</div>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="lg" className="flex-1" onClick={onBack}>← Back</Button>
        <Button size="lg" className="flex-[2]" onClick={onNext}>Continue →</Button>
      </div>
    </StepCard>
  );
}

/* ---------------- Step: Location ---------------- */
function LocationView({
  city,
  setCity,
  cities,
  locStatus,
  detect,
  onBack,
  onNext,
}: {
  city: string;
  setCity: (c: string) => void;
  cities: string[];
  locStatus: "idle" | "loading" | "ok" | "err";
  detect: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <StepCard step={3} total={3} title="Where are you?" subtitle="We'll only suggest restaurants in your area.">
      <button
        onClick={detect}
        disabled={locStatus === "loading"}
        className="w-full rounded-2xl border-2 border-dashed border-border p-5 text-left transition hover:border-foreground/40"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[image:var(--gradient-warm)] text-white text-xl">📍</div>
          <div className="flex-1">
            <div className="font-semibold">Use my current location</div>
            <div className="text-xs text-muted-foreground">
              {locStatus === "loading" && "Detecting…"}
              {locStatus === "ok" && `Detected: ${city}`}
              {locStatus === "err" && "Couldn't detect — type your city below"}
              {locStatus === "idle" && "Tap to allow location access"}
            </div>
          </div>
        </div>
      </button>

      <div className="text-center text-xs text-muted-foreground">— or —</div>

      <div>
        <Label htmlFor="city" className="mb-2 block">Type your city</Label>
        <Input
          id="city"
          list="city-list"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Bangalore, Mumbai, Delhi…"
          className="h-12 text-base"
        />
        <datalist id="city-list">
          {cities.slice(0, 300).map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="lg" className="flex-1" onClick={onBack}>← Back</Button>
        <Button size="lg" className="flex-[2]" disabled={!city.trim()} onClick={onNext}>
          Start collecting →
        </Button>
      </div>
    </StepCard>
  );
}

/* ---------------- Handover (privacy gate) ---------------- */
function HandoverView({
  index,
  total,
  onReady,
}: {
  index: number;
  total: number;
  onReady: () => void;
}) {
  return (
    <Card className="space-y-6 p-10 text-center shadow-[var(--shadow-warm)]">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[image:var(--gradient-warm)] text-3xl text-white shadow-[var(--shadow-warm)]">
        🤝
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Person {index + 1} of {total}</p>
        <h2 className="mt-2 text-3xl font-bold">Pass the device</h2>
        <p className="mt-3 text-muted-foreground">
          Hand the phone to the next person. Their answers stay private — nobody else
          will see what they pick.
        </p>
      </div>
      <Button size="lg" className="w-full" onClick={onReady}>
        I'm ready — show me my page
      </Button>
    </Card>
  );
}

/* ---------------- Collect (per person) ---------------- */
function CollectView({
  index,
  total,
  draft,
  setDraft,
  onSubmit,
}: {
  index: number;
  total: number;
  draft: MemberPrefs;
  setDraft: (p: MemberPrefs) => void;
  onSubmit: () => void;
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
    <Card className="space-y-7 p-6 shadow-[var(--shadow-warm)] sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Anonymous</p>
          <h2 className="mt-1 text-2xl font-bold">Your turn — Person {index + 1}</h2>
        </div>
        <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-[image:var(--gradient-warm)] transition-all"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Cuisines you'd enjoy</Label>
        <div className="flex gap-2">
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCuisine(typed);
              }
            }}
            placeholder="Type a cuisine and press Enter (e.g. Thai, Biryani)"
            className="h-11"
          />
          <Button onClick={() => addCuisine(typed)} disabled={!typed.trim()}>Add</Button>
        </div>
        {draft.cuisines.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {draft.cuisines.map((c) => (
              <button
                key={c}
                onClick={() => removeCuisine(c)}
                className="group flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-sm text-background"
              >
                {c} <span className="opacity-60 group-hover:opacity-100">✕</span>
              </button>
            ))}
          </div>
        )}
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-muted-foreground">Or pick from suggestions:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_CUISINES.filter((c) => !draft.cuisines.includes(c)).map((c) => (
              <button
                key={c}
                onClick={() => addCuisine(c)}
                className="rounded-full border border-border px-2.5 py-1 text-xs hover:border-foreground/40"
              >
                + {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Max budget per person</Label>
        <div className="flex flex-wrap gap-2">
          {BUDGETS.map((b) => (
            <button
              key={b}
              onClick={() => setDraft({ ...draft, budgetMax: b })}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                draft.budgetMax === b
                  ? "border-transparent bg-[image:var(--gradient-warm)] text-white"
                  : "border-border hover:border-foreground/40"
              }`}
            >
              ₹{b}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Allergies & restrictions</Label>
        <div className="flex flex-wrap gap-2">
          {ALLERGIES.map((a) => {
            const on = draft.allergies.includes(a);
            return (
              <button
                key={a}
                onClick={() => toggleAllergy(a)}
                className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${
                  on
                    ? "border-destructive bg-destructive text-destructive-foreground"
                    : "border-border hover:border-foreground/40"
                }`}
              >
                {on ? "✕ " : ""}{a}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Restaurants matching any allergy will be excluded for the whole group.
        </p>
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={!draft.cuisines.length}
        onClick={onSubmit}
      >
        Submit privately & pass device →
      </Button>
    </Card>
  );
}

/* ---------------- Result ---------------- */
function ResultView({
  recs,
  theme,
  city,
  memberCount,
  onReset,
}: {
  recs: Restaurant[];
  theme: Theme;
  city: string;
  memberCount: number;
  onReset: () => void;
}) {
  const themeMeta = THEMES.find((t) => t.id === theme)!;
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {memberCount} anonymous votes · {themeMeta.emoji} {themeMeta.label} · 📍 {city}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Top 3 picks for your group
        </h2>
      </div>

      {recs.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No restaurants matched everyone's constraints in <b>{city}</b>. Try loosening
            allergies, raising budget, or another city.
          </p>
        </Card>
      )}

      <div className="space-y-5">
        {recs.map((r, i) => (
          <Card key={r.i} className="overflow-hidden shadow-[var(--shadow-warm)]">
            <div className="relative h-48 sm:h-56">
              <img
                src={photoFor(r.i, 1000)}
                alt={r.n}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-warm)] text-lg font-bold text-white shadow-[var(--shadow-warm)]">
                #{i + 1}
              </div>
              <div className="absolute right-4 top-4 rounded-full bg-background/90 px-3 py-1 text-sm font-semibold backdrop-blur">
                ★ {r.r}
              </div>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl font-semibold">{r.n}</h3>
                <span className="text-sm text-muted-foreground">₹{r.p} for two</span>
              </div>
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <span>📍</span>
                <span className="flex-1">{r.a || r.c}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {r.q.slice(0, 6).map((c) => (
                  <Badge key={c} variant="secondary">{c}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={mapsLink(r.n, r.a || r.c)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90"
                >
                  🗺️ Directions
                </a>
                <a
                  href={menuSearchLink(r.n, r.c)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  📖 View menu
                </a>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button variant="outline" size="lg" className="w-full" onClick={onReset}>
        Start over
      </Button>
    </div>
  );
}

/* ---------------- Shared step card ---------------- */
function StepCard({
  step,
  total,
  title,
  subtitle,
  children,
}: {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-6 p-6 shadow-[var(--shadow-warm)] sm:p-8">
      <div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < step ? "bg-[image:var(--gradient-warm)]" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
          Step {step} of {total}
        </p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1.5 text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}
