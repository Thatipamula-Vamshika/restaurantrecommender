import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { photoFor, mapsLink } from "@/lib/restaurant-media";
import { menuFor } from "@/lib/menu";
import { citiesWithinKm, nearestCity } from "@/lib/geo";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CommunalTable — Anonymous group restaurant picks" },
      { name: "description", content: "Anonymous group voting for restaurants. Combine cuisine, budget and allergies fairly." },
      { property: "og:title", content: "CommunalTable" },
      { property: "og:description", content: "Anonymous collaboration for better dining." },
    ],
  }),
  component: Page,
});

const SUGGESTED_CUISINES = [
  "North Indian", "South Indian", "Chinese", "Biryani", "Pizzas", "Italian",
  "Continental", "Fast Food", "Desserts", "Bakery", "Beverages", "Mughlai",
  "Punjabi", "Thalis", "Healthy Food", "Snacks", "Ice Cream", "Pastas",
];
const ALLERGIES = Object.keys(ALLERGY_MAP);
const ALLERGY_META: Record<string, { emoji: string }> = {
  dairy: { emoji: "🥛" }, gluten: { emoji: "🌾" }, nuts: { emoji: "🥜" },
  seafood: { emoji: "🐟" }, egg: { emoji: "🥚" }, shellfish: { emoji: "🦐" },
};

type Stage = "intro" | "size" | "collect" | "result";

function Page() {
  const [catalog, setCatalog] = useState<Restaurant[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("intro");

  const [theme, setTheme] = useState<Theme>("casual");
  const [groupSize, setGroupSize] = useState(3);
  const [state, setState] = useState<string>("");
  const [city, setCity] = useState("");
  const [nearbyCities, setNearbyCities] = useState<string[] | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [locLabel, setLocLabel] = useState<string>("");

  const [currentMember, setCurrentMember] = useState(0);
  const [members, setMembers] = useState<MemberPrefs[]>([]);
  const [draft, setDraft] = useState<MemberPrefs>(emptyPrefs());

  useEffect(() => {
    fetch("/restaurants.json")
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => setLoadErr("Failed to load restaurant data"));
  }, []);

  const cityOptions = useMemo(() => (state ? STATE_CITIES[state] ?? [] : []), [state]);

  const result = useMemo(() => {
    if (stage !== "result" || !catalog) return null;
    const cityList = nearbyCities && nearbyCities.length
      ? nearbyCities
      : state && !city ? STATE_CITIES[state] : undefined;
    return recommend(catalog, members, theme, city || undefined, cityList);
  }, [stage, catalog, members, theme, city, state, nearbyCities]);

  const detectLocation = () => {
    if (!navigator.geolocation) { setLocStatus("err"); return; }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Nearby cities within 5km radius via haversine; if none, use the closest city.
        const within = citiesWithinKm(latitude, longitude, 5);
        const nearest = nearestCity(latitude, longitude);
        const list = within.length ? within.map((x) => x.city) : nearest ? [nearest.city] : [];
        setNearbyCities(list);
        if (nearest) {
          setLocLabel(`${nearest.city} (~${Math.round(nearest.km)} km)`);
          const guessed = stateForCity(nearest.city);
          if (guessed) setState(guessed);
          setCity(nearest.city);
        }
        // Optional reverse geocode for nicer state name
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const d = await res.json();
          const s = d?.address?.state as string | undefined;
          if (s && ALL_STATES.includes(s)) setState(s);
        } catch { /* ignore */ }
        setLocStatus("ok");
      },
      () => setLocStatus("err"),
      { timeout: 10000 },
    );
  };

  const startGroup = () => {
    setMembers([]);
    setCurrentMember(0);
    setDraft(emptyPrefs());
    setStage("size");
  };

  const beginCollect = () => {
    setMembers([]);
    setCurrentMember(0);
    setDraft(emptyPrefs());
    setStage("collect");
  };

  const submitMember = () => {
    if (!draft.cuisines.length) return;
    const next = [...members, draft];
    setMembers(next);
    setDraft(emptyPrefs()); // wipe so next person sees a clean form
    if (next.length >= groupSize) setStage("result");
    else setCurrentMember((i) => i + 1);
  };

  const reset = () => {
    setStage("intro"); setMembers([]); setCurrentMember(0); setDraft(emptyPrefs());
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        {loadErr && <p className="text-destructive">{loadErr}</p>}
        {!catalog && !loadErr && <p className="text-muted-foreground">Loading restaurants…</p>}

        {catalog && stage === "intro" && (
          <IntroView
            theme={theme} setTheme={setTheme}
            state={state} setState={setState}
            city={city} setCity={setCity}
            cityOptions={cityOptions}
            locStatus={locStatus} locLabel={locLabel} detect={detectLocation}
            onStart={startGroup}
          />
        )}

        {catalog && stage === "size" && (
          <SizeView groupSize={groupSize} setGroupSize={setGroupSize}
            onBack={() => setStage("intro")} onNext={beginCollect} />
        )}

        {catalog && stage === "collect" && (
          <CollectView
            key={currentMember} // hard reset inputs between people
            index={currentMember} total={groupSize}
            draft={draft} setDraft={setDraft}
            onSubmit={submitMember}
            place={city || state}
          />
        )}

        {catalog && stage === "result" && result && (
          <ResultView picks={result.picks} fallback={result.fallback}
            theme={theme} place={city || state} memberCount={members.length} onReset={reset} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function emptyPrefs(): MemberPrefs {
  return { cuisines: [], budgetMax: 600, allergies: [] };
}

/* =============== INTRO (visual hero + theme browse) =============== */
function IntroView(props: {
  theme: Theme; setTheme: (t: Theme) => void;
  state: string; setState: (s: string) => void;
  city: string; setCity: (s: string) => void;
  cityOptions: string[];
  locStatus: "idle" | "loading" | "ok" | "err";
  locLabel: string;
  detect: () => void;
  onStart: () => void;
}) {
  const { theme, setTheme, state, setState, city, setCity, cityOptions,
    locStatus, locLabel, detect, onStart } = props;

  // scroll-driven parallax on hero strip
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (stripRef.current) {
          const els = stripRef.current.querySelectorAll<HTMLElement>("[data-speed]");
          els.forEach((el) => {
            const s = Number(el.dataset.speed || 0);
            el.style.transform = `translate3d(${y * s}px, ${y * s * 0.2}px, 0)`;
          });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  const heroSeeds = [101, 202, 303, 404, 505, 606, 707, 808, 909];

  return (
    <div className="space-y-24">
      {/* === ANIMATED HERO === */}
      <section className="relative overflow-hidden rounded-3xl border border-border" style={{ background: "var(--gradient-hero)" }}>
        <div className="relative grid items-center gap-6 px-6 py-14 sm:px-12 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/70 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Anonymous · No accounts
            </span>
            <h1 className="mt-4 font-serif text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Where should{" "}
              <span className="relative inline-block text-primary">
                we eat?
                <span className="absolute -bottom-1 left-0 h-1 w-full origin-left scale-x-0 animate-[underline_1.2s_ease-out_0.4s_forwards] bg-primary/70" />
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-foreground/70 sm:text-lg">
              Everyone votes silently. We blend cuisine, budget and allergies into one fair pick — with photo, menu and map.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" onClick={onStart}
                className="rounded-full bg-primary px-7 text-base text-primary-foreground shadow-[var(--shadow-warm)] hover:bg-primary/90">
                🚀 Start a group
              </Button>
              <a href="#themes"
                className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium hover:border-primary/40">
                Browse by vibe →
              </a>
            </div>

            {/* Location detect */}
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/80 p-3 shadow-[var(--shadow-soft)] backdrop-blur">
              <button onClick={detect}
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15">
                📍 {locStatus === "loading" ? "Detecting…" : locStatus === "ok" ? "Re-detect" : "Use my location"}
              </button>
              <span className="text-sm text-muted-foreground">
                {locStatus === "ok" && locLabel ? `Closest: ${locLabel}` :
                 locStatus === "err" ? "Couldn't detect — pick state below" :
                 "We use Haversine distance to find places near you."}
              </span>
            </div>
          </div>

          {/* Animated photo strip */}
          <div ref={stripRef} className="relative h-[440px] sm:h-[520px]">
            <FloatPhoto seed={heroSeeds[0]} className="left-2 top-2 h-44 w-56 rotate-[-6deg]" speed={-0.05} />
            <FloatPhoto seed={heroSeeds[1]} className="right-0 top-0 h-52 w-44 rotate-[5deg]" speed={0.03} />
            <FloatPhoto seed={heroSeeds[2]} className="left-1/3 top-32 h-56 w-48 rotate-[-2deg] z-10 ring-4 ring-card" speed={-0.02} />
            <FloatPhoto seed={heroSeeds[3]} className="right-2 bottom-12 h-44 w-52 rotate-[7deg]" speed={0.06} />
            <FloatPhoto seed={heroSeeds[4]} className="left-0 bottom-0 h-40 w-44 rotate-[-9deg]" speed={-0.04} />
          </div>
        </div>

        {/* Marquee strip below */}
        <div className="border-t border-border/60 bg-card/60 backdrop-blur">
          <div className="flex items-center gap-12 overflow-hidden whitespace-nowrap py-3 text-sm font-medium text-foreground/70 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex animate-[marquee_28s_linear_infinite] gap-12 pr-12">
              {["🍕 Pizzas", "🥘 Biryani", "🍜 Chinese", "🥗 Healthy", "🌶️ Mughlai", "🥥 South Indian", "🍰 Desserts", "🥤 Cafe", "🍔 Burgers", "🍝 Italian", "🍛 North Indian", "🍱 Thalis"].map((s, i) => (
                <span key={i}>{s}</span>
              ))}
            </div>
            <div className="flex animate-[marquee_28s_linear_infinite] gap-12 pr-12" aria-hidden>
              {["🍕 Pizzas", "🥘 Biryani", "🍜 Chinese", "🥗 Healthy", "🌶️ Mughlai", "🥥 South Indian", "🍰 Desserts", "🥤 Cafe", "🍔 Burgers", "🍝 Italian", "🍛 North Indian", "🍱 Thalis"].map((s, i) => (
                <span key={i}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* === LOCATION CARD === */}
      <section className="grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-xs uppercase tracking-wider text-primary">Step 1</p>
          <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight">Pick a place to search</h2>
          <p className="mt-2 text-muted-foreground">
            Auto-detect uses your GPS + Haversine distance to find restaurants within a 5 km radius — or pick your state manually.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">State</Label>
              <Select value={state} onValueChange={(v) => { setState(v); setCity(""); }}>
                <SelectTrigger className="mt-1.5 h-10 bg-secondary"><SelectValue placeholder="Select your state" /></SelectTrigger>
                <SelectContent>
                  {ALL_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">City (optional)</Label>
              <Select value={city} onValueChange={setCity} disabled={!state}>
                <SelectTrigger className="mt-1.5 h-10 bg-secondary">
                  <SelectValue placeholder={state ? "Any city" : "Pick state first"} />
                </SelectTrigger>
                <SelectContent>
                  {cityOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-[oklch(0.93_0.01_75)] p-6">
          <div className="text-2xl">🗺️</div>
          <div className="mt-2 font-semibold">Currently searching</div>
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-sm font-medium text-primary">
            📍 {city || state || "Anywhere in India"}
          </div>
          <Button size="lg" onClick={onStart} disabled={!state}
            className="mt-5 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
            Start Group →
          </Button>
          {!state && <p className="mt-2 text-center text-xs text-muted-foreground">Select a state (or use location) to enable.</p>}
        </div>
      </section>

      {/* === THEME BROWSE === */}
      <section id="themes" className="space-y-6 scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary">Step 2 · Or just browse</p>
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Pick a vibe</h2>
            <p className="text-muted-foreground">Tap a theme to see top restaurants matching it — with menu & map.</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {THEMES.map((t, i) => (
            <Link key={t.id} to="/theme/$theme" params={{ theme: t.id }}
              className="group relative block aspect-[4/5] overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-warm)]">
              <img src={photoFor(`theme-${t.id}-${i}`, 800)} alt={t.label}
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="text-3xl drop-shadow">{t.emoji}</div>
                <div className="mt-1.5 text-lg font-bold">{t.label}</div>
                <div className="mt-1 text-xs opacity-90">Tap to explore →</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)] sm:p-12">
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">Anonymous, fair, safe.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Each person types their preferences silently. No dialogues. No "pass the phone" moments —
          inputs auto-clear so the next person sees a clean form. Your budget is never revealed in the result.
        </p>
        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={onStart} disabled={!props.state}
            className="rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary/90">
            Start a group now →
          </Button>
        </div>
      </section>
    </div>
  );
}

function FloatPhoto({ seed, className, speed }: { seed: number | string; className: string; speed: number }) {
  return (
    <div data-speed={speed}
      className={`absolute overflow-hidden rounded-2xl border-2 border-card shadow-[var(--shadow-warm)] transition-transform duration-300 ${className}`}>
      <img src={photoFor(seed, 600)} alt="" className="h-full w-full object-cover" loading="eager" />
    </div>
  );
}

/* =============== SIZE picker =============== */
function SizeView({ groupSize, setGroupSize, onBack, onNext }: {
  groupSize: number; setGroupSize: (n: number) => void; onBack: () => void; onNext: () => void;
}) {
  const [val, setVal] = useState(String(groupSize));
  const commit = () => {
    const n = Math.max(2, Math.min(20, Number(val) || 2));
    setGroupSize(n); setVal(String(n));
  };
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--shadow-warm)] sm:p-10">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Group setup</p>
      <h2 className="mt-1 font-serif text-3xl font-bold">How many people?</h2>
      <p className="mt-2 text-muted-foreground">Type the number. Each person enters preferences anonymously, one after the other.</p>
      <div className="mt-7">
        <Input type="number" min={2} max={20} inputMode="numeric"
          value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit}
          className="mx-auto h-16 max-w-[160px] bg-secondary text-center text-3xl font-bold" />
      </div>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button size="lg" onClick={() => { commit(); onNext(); }}
          className="rounded-full bg-primary px-7 text-primary-foreground hover:bg-primary/90">
          Begin (Person 1) →
        </Button>
      </div>
    </div>
  );
}

/* =============== COLLECT (per person, anonymous, no dialogue) =============== */
function CollectView({
  index, total, draft, setDraft, onSubmit, place,
}: {
  index: number; total: number;
  draft: MemberPrefs; setDraft: (p: MemberPrefs) => void;
  onSubmit: () => void; place: string;
}) {
  const [typed, setTyped] = useState("");
  const [budgetText, setBudgetText] = useState(String(draft.budgetMax));

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
  const commitBudget = () => {
    const n = Math.max(50, Math.min(10000, Number(budgetText) || 600));
    setBudgetText(String(n));
    setDraft({ ...draft, budgetMax: n });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            🔒 Person {index + 1} of {total} · Anonymous
          </span>
          <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight">Your turn — type silently</h1>
          <p className="mt-1.5 max-w-2xl text-muted-foreground">
            Searching in <strong>{place || "your area"}</strong>. Nothing you type is shown to anyone else.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i}
              className={`h-2 w-6 rounded-full ${i < index ? "bg-primary" : i === index ? "bg-primary/60" : "bg-border"}`} />
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* Cuisines — type freely */}
          <Section title="Cuisines you'd love" icon="🍽️">
            <div className="flex flex-wrap gap-2">
              <Input value={typed} onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCuisine(typed); } }}
                placeholder="Type a cuisine (e.g., Biryani) and press Enter"
                className="h-11 flex-1 min-w-[220px] bg-secondary text-base" autoFocus />
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
              <p className="mb-1.5 text-xs text-muted-foreground">Or pick a suggestion:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_CUISINES.filter((c) => !draft.cuisines.includes(c)).slice(0, 14).map((c) => (
                  <button key={c} onClick={() => addCuisine(c)}
                    className="rounded-full border border-border bg-card px-2.5 py-1 text-xs hover:border-primary/40">+ {c}</button>
                ))}
              </div>
            </div>
          </Section>

          {/* Budget — typed only */}
          <Section title="Your max budget per person" icon="💵">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl font-bold text-primary">₹</span>
              <Input type="number" min={50} max={10000} inputMode="numeric"
                value={budgetText}
                onChange={(e) => setBudgetText(e.target.value)}
                onBlur={commitBudget}
                onKeyDown={(e) => { if (e.key === "Enter") commitBudget(); }}
                className="h-12 w-40 bg-secondary text-xl font-semibold" />
              <span className="text-sm text-muted-foreground">per person · type any amount</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              We'll use the lowest budget across the group so nobody overspends.
            </p>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Allergies / dietary" icon="⚠️">
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
              Any allergy excludes risky places for the whole group.
            </p>
          </Section>

          <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-[var(--shadow-warm)]">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Privacy</p>
            <p className="mt-1.5 text-sm opacity-95">Nothing you type is saved or shown to others. Pressing submit clears the form completely.</p>
            <Button size="lg" disabled={!draft.cuisines.length} onClick={onSubmit}
              className="mt-4 w-full bg-card text-primary hover:bg-card/90">
              {index + 1 === total ? "Submit & see result" : `Submit — pass to person ${index + 2}`}
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

/* =============== RESULT =============== */
function ResultView({
  picks, fallback, theme, place, memberCount, onReset,
}: {
  picks: Restaurant[]; fallback: boolean; theme: Theme; place: string; memberCount: number; onReset: () => void;
}) {
  const themeMeta = THEMES.find((t) => t.id === theme)!;
  const top = picks[0];
  const alts = picks.slice(1, 3);

  if (!top) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
        <h2 className="font-serif text-3xl font-bold">No matches in {place || "your area"}</h2>
        <p className="mt-3 text-muted-foreground">Try widening the city, or relax some allergies.</p>
        <Button onClick={onReset} className="mt-5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.92_0.07_145)] px-3.5 py-1.5 text-sm font-semibold text-[oklch(0.35_0.1_150)]">
          {fallback ? "✨ Best nearby picks" : "🎉 Decision reached"}
        </span>
        <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">
          {fallback ? "We picked the best places near you" : "Your group chose"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {memberCount} anonymous votes · {themeMeta.emoji} {themeMeta.label} · {place || "Anywhere"}
          {fallback && " · perfect match wasn't found, here are our top suggestions"}
        </p>
      </div>

      <PickCard r={top} highlight place={place} />

      {alts.length > 0 && (
        <div>
          <h2 className="font-serif text-2xl font-bold">Also great</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {alts.map((r) => <PickCard key={r.i} r={r} place={place} />)}
          </div>
        </div>
      )}

      <div className="text-center">
        <Button variant="outline" onClick={onReset} className="rounded-full">Start a new group</Button>
      </div>
    </div>
  );
}

function PickCard({ r, place, highlight = false }: { r: Restaurant; place?: string; highlight?: boolean }) {
  const menu = menuFor(r.q, highlight ? 6 : 4);
  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(`${r.n} ${r.a}`)}&output=embed`;

  return (
    <div className={`overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-soft)] ${highlight ? "border-primary/40 shadow-[var(--shadow-warm)]" : "border-border"}`}>
      <div className="relative">
        <img src={photoFor(r.i, 1200)} alt={r.n} className={`w-full object-cover ${highlight ? "h-72 sm:h-80" : "h-44"}`} loading="lazy" />
        <span className="absolute right-3 top-3 rounded-full bg-card/95 px-3 py-1 text-sm font-semibold text-primary">★ {r.r.toFixed(1)}</span>
        {highlight && <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase text-primary-foreground">Top pick</span>}
      </div>
      <div className="p-5">
        <div className={`font-serif font-bold ${highlight ? "text-2xl sm:text-3xl" : "text-lg"}`}>{r.n}</div>
        <p className="mt-1 text-sm text-muted-foreground">{r.a}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {r.q.slice(0, 4).map((c) => (
            <span key={c} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{c}</span>
          ))}
        </div>

        <div className={`mt-4 grid gap-4 ${highlight ? "lg:grid-cols-[1fr_1fr]" : ""}`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Indicative menu</p>
            <ul className="mt-1.5 divide-y divide-border text-sm">
              {menu.map((m) => (
                <li key={m.item} className="flex items-center justify-between py-1.5">
                  <span>{m.item}</span>
                  <span className="font-semibold">₹{m.price}</span>
                </li>
              ))}
            </ul>
          </div>
          {highlight && (
            <div className="overflow-hidden rounded-xl border border-border">
              <iframe title={`Map of ${r.n}`} src={mapEmbed}
                className="h-full min-h-[220px] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/restaurant/$id" params={{ id: String(r.i) }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Full menu & map →
          </Link>
          <a href={mapsLink(r.n, r.a)} target="_blank" rel="noreferrer"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40">
            🗺️ Directions
          </a>
          {place && <span className="ml-auto self-center text-xs text-muted-foreground">in {r.c}</span>}
        </div>
      </div>
    </div>
  );
}
