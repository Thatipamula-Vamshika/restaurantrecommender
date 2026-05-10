import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { THEMES, type Restaurant, type Theme } from "@/lib/recommend";
import { photoFor } from "@/lib/restaurant-media";

export const Route = createFileRoute("/theme/$theme")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.theme} restaurants — CommunalTable` },
      { name: "description", content: `Top ${params.theme} restaurants picked from 60K+ Indian options.` },
    ],
  }),
  component: ThemePage,
});

function ThemePage() {
  const { theme } = Route.useParams() as { theme: Theme };
  const themeMeta = THEMES.find((t) => t.id === theme);
  const [catalog, setCatalog] = useState<Restaurant[] | null>(null);
  const [city, setCity] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/restaurants.json").then((r) => r.json()).then(setCatalog).catch(() => setCatalog([]));
  }, []);

  const list = useMemo(() => {
    if (!catalog || !themeMeta) return [];
    const boost = themeMeta.boost.map((s) => s.toLowerCase());
    return catalog
      .filter((r) => r.q.some((c) => boost.includes(c.toLowerCase())))
      .filter((r) => !city || r.c.toLowerCase().includes(city.toLowerCase()))
      .sort((a, b) => b.r - a.r)
      .slice(0, 24);
  }, [catalog, themeMeta, city]);

  if (!themeMeta) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 text-center">
          <h1 className="font-serif text-3xl font-bold">Theme not found</h1>
          <Link to="/" className="mt-4 inline-block text-primary underline">Back home</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Theme</p>
            <h1 className="font-serif text-4xl font-bold tracking-tight">
              <span className="mr-2">{themeMeta.emoji}</span>{themeMeta.label}
            </h1>
            <p className="mt-2 text-muted-foreground">Highly-rated places matching this vibe.</p>
          </div>
          <input
            value={city} onChange={(e) => setCity(e.target.value)}
            placeholder="Filter by city…"
            className="h-10 rounded-md border border-input bg-secondary px-3 text-sm"
          />
        </div>

        {!catalog && <p className="mt-10 text-muted-foreground">Loading…</p>}
        {catalog && !list.length && (
          <p className="mt-10 text-muted-foreground">No restaurants found. Try another city.</p>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <button
              key={r.i}
              onClick={() => navigate({ to: "/restaurant/$id", params: { id: String(r.i) } })}
              className="group overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-warm)]"
            >
              <div className="relative h-44 overflow-hidden">
                <img src={photoFor(r.i, 800)} alt={r.n}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                <span className="absolute right-3 top-3 rounded-full bg-card/95 px-2.5 py-0.5 text-xs font-semibold text-primary">★ {r.r.toFixed(1)}</span>
              </div>
              <div className="p-4">
                <div className="font-semibold">{r.n}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{r.c}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.q.slice(0, 3).map((c) => (
                    <span key={c} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{c}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
