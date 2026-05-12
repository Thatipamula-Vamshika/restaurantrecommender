import { useEffect, useState } from "react";

// In-app modal that embeds the Zomato/Swiggy menu page via Google search.
// Many restaurant sites block iframing; we provide a fallback "Open in tab" link.
export function MenuModal({
  open, onClose, name, city,
}: {
  open: boolean; onClose: () => void; name: string; city: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [open, name]);
  if (!open) return null;

  // Google's "I'm Feeling Lucky" tends to land directly on the menu page.
  const q = encodeURIComponent(`${name} ${city} menu site:zomato.com OR site:swiggy.com`);
  const src = `https://www.google.com/search?igu=1&q=${q}`;
  const directZomato = `https://www.zomato.com/${encodeURIComponent(city.toLowerCase())}/restaurants?q=${encodeURIComponent(name)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-[fade-in_0.2s_ease-out]"
         onClick={onClose}>
      <div className="relative h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-card shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Full menu</p>
            <h3 className="font-serif text-lg font-bold">{name} <span className="text-muted-foreground">· {city}</span></h3>
          </div>
          <div className="flex items-center gap-2">
            <a href={directZomato} target="_blank" rel="noreferrer"
               className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium hover:border-primary/40">
              Open in new tab ↗
            </a>
            <button onClick={onClose}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Close ✕
            </button>
          </div>
        </div>
        <div className="relative h-[calc(90vh-60px)]">
          {!failed ? (
            <iframe
              title={`${name} menu`}
              src={src}
              className="h-full w-full"
              referrerPolicy="no-referrer"
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <p className="text-muted-foreground">The menu site blocked embedding.</p>
                <a href={directZomato} target="_blank" rel="noreferrer"
                   className="mt-3 inline-block rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90">
                  Open menu in new tab →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
