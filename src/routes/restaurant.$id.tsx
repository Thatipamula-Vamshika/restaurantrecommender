import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { type Restaurant } from "@/lib/recommend";
import { photoFor, mapsLink, fullMenuLink, menuSearchLink } from "@/lib/restaurant-media";
import { menuFor } from "@/lib/menu";

export const Route = createFileRoute("/restaurant/$id")({
  head: () => ({
    meta: [{ title: "Restaurant — CommunalTable" }],
  }),
  component: RestaurantPage,
});

function RestaurantPage() {
  const { id } = Route.useParams();
  const [r, setR] = useState<Restaurant | null | "missing">(null);

  useEffect(() => {
    fetch("/restaurants.json").then((res) => res.json()).then((all: Restaurant[]) => {
      const found = all.find((x) => String(x.i) === id);
      setR(found ?? "missing");
    });
  }, [id]);

  if (r === null) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-5 py-14 text-muted-foreground">Loading…</main>
      </div>
    );
  }
  if (r === "missing") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-5 py-14 text-center">
          <h1 className="font-serif text-3xl font-bold">Restaurant not found</h1>
          <Link to="/" className="mt-4 inline-block text-primary underline">Back home</Link>
        </main>
      </div>
    );
  }

  const menu = menuFor(r.q);
  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(`${r.n} ${r.a}`)}&output=embed`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-warm)]">
          <img src={photoFor(r.i, 1400, r.q)} alt={r.n} className="h-72 w-full object-cover sm:h-96" />
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl font-bold tracking-tight">{r.n}</h1>
            <p className="mt-1 text-muted-foreground">{r.c}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.q.map((c) => (
                <span key={c} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{c}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">★ {r.r.toFixed(1)}</span>
            <div className="flex flex-wrap justify-end gap-2">
              <a href={fullMenuLink(r.n, r.c)} target="_blank" rel="noreferrer"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                View full menu (Zomato) →
              </a>
              <a href={menuSearchLink(r.n, r.c)} target="_blank" rel="noreferrer"
                className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40">
                Search Swiggy
              </a>
              <a href={mapsLink(r.n, r.a)} target="_blank" rel="noreferrer"
                className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40">
                Open in Maps
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="font-serif text-xl font-bold">Menu (indicative)</h2>
            <ul className="mt-4 divide-y divide-border">
              {menu.map((m) => (
                <li key={m.item} className="flex items-center justify-between py-2.5">
                  <span>{m.item}</span>
                  <span className="font-semibold">₹{m.price}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Menu items are typical for this cuisine — confirm exact dishes & prices on the restaurant's own page.
            </p>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <h3 className="font-semibold">Address</h3>
              <p className="mt-1.5 text-sm text-foreground/80">{r.a}</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-soft)]">
              <iframe
                title="map"
                src={mapEmbed}
                className="h-72 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
