import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ALLERGY_MAP, THEMES, recommend, type MemberPrefs, type Restaurant, type Theme } from "@/lib/recommend";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GroupBite — Anonymous restaurant picker for groups" },
      { name: "description", content: "Collect cuisine, budget, allergy & vibe inputs from your group anonymously and get the top 3 restaurants." },
      { property: "og:title", content: "GroupBite — Anonymous restaurant picker" },
      { property: "og:description", content: "Pass-the-device group dining decisions, made fair and allergy-safe." },
    ],
  }),
  component: Page,
});

const POPULAR_CUISINES = [
  "North Indian","South Indian","Chinese","Biryani","Pizzas","Italian",
  "Continental","Fast Food","Desserts","Bakery","Beverages","Mughlai",
  "Punjabi","Thalis","Healthy Food","Snacks","Ice Cream","Pastas",
];

const ALLERGIES = Object.keys(ALLERGY_MAP);

const BUDGETS = [200, 400, 700, 1200, 2000];

type Stage = "setup" | "collect" | "result";

function Page() {
  const [catalog, setCatalog] = useState<Restaurant[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("setup");
  const [groupSize, setGroupSize] = useState(3);
  const [theme, setTheme] = useState<Theme>("casual");
  const [city, setCity] = useState("Bangalore");
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

  const startCollect = () => {
    setMembers([]);
    setCurrentMember(0);
    setDraft(emptyPrefs());
    setStage("collect");
  };

  const submitMember = () => {
    if (!draft.cuisines.length) return;
    const next = [...members, draft];
    setMembers(next);
    setDraft(emptyPrefs());
    if (next.length >= groupSize) setStage("result");
    else setCurrentMember((i) => i + 1);
  };

  const reset = () => {
    setStage("setup");
    setMembers([]);
    setCurrentMember(0);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-warm)] text-white shadow-[var(--shadow-warm)]">
              <span className="text-lg">🍽️</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">GroupBite</h1>
          </div>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Anonymous group dining decisions
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {loadErr && <p className="text-destructive">{loadErr}</p>}
        {!catalog && !loadErr && <p className="text-muted-foreground">Loading 60k+ restaurants…</p>}

        {catalog && stage === "setup" && (
          <SetupView
            groupSize={groupSize}
            setGroupSize={setGroupSize}
            theme={theme}
            setTheme={setTheme}
            city={city}
            setCity={setCity}
            cities={cities}
            onStart={startCollect}
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
          <ResultView recs={recs} theme={theme} memberCount={members.length} onReset={reset} />
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

function SetupView(props: {
  groupSize: number;
  setGroupSize: (n: number) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  city: string;
  setCity: (c: string) => void;
  cities: string[];
  onStart: () => void;
}) {
  return (
    <Card className="space-y-6 p-8 shadow-[var(--shadow-warm)]">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Plan your group meal</h2>
        <p className="mt-2 text-muted-foreground">
          Pass the device — each person enters preferences anonymously. We balance everyone's
          inputs and exclude anything that triggers an allergy.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label className="mb-2 block">Group size</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => props.setGroupSize(Math.max(2, props.groupSize - 1))}>−</Button>
            <span className="w-12 text-center text-2xl font-semibold">{props.groupSize}</span>
            <Button variant="outline" size="icon" onClick={() => props.setGroupSize(Math.min(10, props.groupSize + 1))}>+</Button>
          </div>
        </div>
        <div>
          <Label htmlFor="city" className="mb-2 block">City (optional filter)</Label>
          <Input
            id="city"
            list="city-list"
            value={props.city}
            onChange={(e) => props.setCity(e.target.value)}
            placeholder="e.g. Bangalore"
          />
          <datalist id="city-list">
            {props.cities.slice(0, 200).map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>

      <div>
        <Label className="mb-3 block">Vibe / theme</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => props.setTheme(t.id)}
              className={`rounded-xl border p-4 text-left transition ${
                props.theme === t.id
                  ? "border-transparent bg-[image:var(--gradient-warm)] text-white shadow-[var(--shadow-warm)]"
                  : "border-border hover:border-foreground/30"
              }`}
            >
              <div className="text-2xl">{t.emoji}</div>
              <div className="mt-1 text-sm font-medium">{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      <Button size="lg" className="w-full" onClick={props.onStart}>
        Start collecting preferences →
      </Button>
    </Card>
  );
}

function CollectView(props: {
  index: number;
  total: number;
  draft: MemberPrefs;
  setDraft: (p: MemberPrefs) => void;
  onSubmit: () => void;
}) {
  const { draft, setDraft } = props;

  const toggleCuisine = (c: string) => {
    setDraft({
      ...draft,
      cuisines: draft.cuisines.includes(c)
        ? draft.cuisines.filter((x) => x !== c)
        : [...draft.cuisines, c],
    });
  };
  const toggleAllergy = (a: string) => {
    setDraft({
      ...draft,
      allergies: draft.allergies.includes(a)
        ? draft.allergies.filter((x) => x !== a)
        : [...draft.allergies, a],
    });
  };

  return (
    <Card className="space-y-6 p-8 shadow-[var(--shadow-warm)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Anonymous · Person {props.index + 1} of {props.total}</p>
          <h2 className="mt-1 text-2xl font-bold">Your turn</h2>
        </div>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-[image:var(--gradient-warm)] transition-all"
            style={{ width: `${((props.index) / props.total) * 100}%` }}
          />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Cuisines you'd enjoy</Label>
        <div className="flex flex-wrap gap-2">
          {POPULAR_CUISINES.map((c) => {
            const on = draft.cuisines.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCuisine(c)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  on
                    ? "border-transparent bg-foreground text-background"
                    : "border-border hover:border-foreground/40"
                }`}
              >
                {c}
              </button>
            );
          })}
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
        onClick={props.onSubmit}
      >
        Submit & pass device →
      </Button>
    </Card>
  );
}

function ResultView(props: {
  recs: Restaurant[];
  theme: Theme;
  memberCount: number;
  onReset: () => void;
}) {
  const themeMeta = THEMES.find((t) => t.id === props.theme)!;
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Based on {props.memberCount} anonymous inputs · {themeMeta.emoji} {themeMeta.label}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">Top 3 picks for your group</h2>
      </div>

      {props.recs.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No restaurants matched everyone's constraints. Try loosening allergies or budget.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {props.recs.map((r, i) => (
          <Card key={r.i} className="overflow-hidden p-6 shadow-[var(--shadow-warm)]">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-warm)] text-xl font-bold text-white">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold">{r.n}</h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">★ {r.r}</span>
                    <span className="text-muted-foreground">₹{r.p} for two</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.c}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.q.slice(0, 5).map((c) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
                {r.a && <p className="mt-2 truncate text-xs text-muted-foreground">{r.a}</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button variant="outline" size="lg" className="w-full" onClick={props.onReset}>
        Start over
      </Button>
    </div>
  );
}
