import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — CommunalTable" },
      { name: "description", content: "Contact CommunalTable support." },
      { property: "og:title", content: "Support — CommunalTable" },
      { property: "og:description", content: "Contact CommunalTable support." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <h1 className="font-serif text-4xl font-bold tracking-tight">Support</h1>
        <p className="mt-4 text-muted-foreground">
          Found a bug, missing a city, or have an idea? Drop us a line — we read every message.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a href="mailto:hello@communaltable.app" className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] hover:border-primary/50">
            <div className="text-2xl">📧</div>
            <div className="mt-2 font-semibold">Email</div>
            <p className="mt-1 text-sm text-muted-foreground">hello@communaltable.app</p>
          </a>
          <a href="https://x.com/" target="_blank" rel="noreferrer" className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] hover:border-primary/50">
            <div className="text-2xl">🐦</div>
            <div className="mt-2 font-semibold">Twitter</div>
            <p className="mt-1 text-sm text-muted-foreground">@communaltable</p>
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
