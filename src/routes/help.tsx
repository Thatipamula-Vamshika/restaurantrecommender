import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help — CommunalTable" },
      { name: "description", content: "FAQ and tips for picking a restaurant as a group." },
      { property: "og:title", content: "Help — CommunalTable" },
      { property: "og:description", content: "FAQ and tips for using CommunalTable." },
    ],
  }),
  component: HelpPage,
});

const FAQ = [
  { q: "Do I need to sign up?", a: "Never. CommunalTable is completely anonymous — no email, no account." },
  { q: "How are budgets combined?", a: "We use the lowest cap in the group so nobody is forced to overspend." },
  { q: "What if someone has a severe allergy?", a: "Any allergy from any member excludes risky restaurants for the whole group." },
  { q: "What if the group has very different tastes?", a: "We still suggest highly-rated nearby places that aren't ruled out by allergies." },
  { q: "Where does the data come from?", a: "A public Swiggy restaurant catalog of 60K+ Indian restaurants. Menus shown are indicative." },
];

function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <h1 className="font-serif text-4xl font-bold tracking-tight">Help & FAQ</h1>
        <div className="mt-8 space-y-4">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-2 text-foreground/80">{f.a}</p>
            </details>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
