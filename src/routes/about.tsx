import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — CommunalTable" },
      { name: "description", content: "Why we built an anonymous group restaurant picker." },
      { property: "og:title", content: "About — CommunalTable" },
      { property: "og:description", content: "Why we built an anonymous group restaurant picker." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <h1 className="font-serif text-4xl font-bold tracking-tight">About CommunalTable</h1>
        <p className="mt-4 text-muted-foreground">
          Picking a restaurant with a group is hard — someone always ends up unheard. CommunalTable
          fixes that with anonymous voting: cuisine, budget and allergy inputs are merged into a
          fair group decision without revealing what any single person picked.
        </p>
        <h2 className="mt-10 font-serif text-2xl font-bold">How it works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-foreground/80">
          <li>Set the group size and theme.</li>
          <li>Each person types their preferences silently — no dialogues, no peeking.</li>
          <li>We aggregate votes, exclude any allergy-risky places, and rank by fit.</li>
          <li>If nothing perfectly matches, we still suggest top-rated nearby spots.</li>
        </ol>
        <h2 className="mt-10 font-serif text-2xl font-bold">Privacy</h2>
        <p className="mt-3 text-foreground/80">
          Nothing leaves your device. We don't track who voted for what — only the aggregate result
          is shown. Budgets are never displayed in the final pick.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
