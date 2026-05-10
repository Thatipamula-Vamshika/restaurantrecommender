import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-primary">
          <span className="text-xl">🍽️</span> CommunalTable
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-foreground/75 sm:flex">
          <Link to="/" className="hover:text-foreground" activeOptions={{ exact: true }} activeProps={{ className: "text-primary" }}>Home</Link>
          <Link to="/about" className="hover:text-foreground" activeProps={{ className: "text-primary" }}>About</Link>
          <Link to="/help" className="hover:text-foreground" activeProps={{ className: "text-primary" }}>Help</Link>
          <Link to="/support" className="hover:text-foreground" activeProps={{ className: "text-primary" }}>Support</Link>
        </nav>
        <Link to="/" hash="start" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Start Group
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/60 py-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-xs text-muted-foreground sm:px-8">
        <span className="font-semibold text-primary">CommunalTable</span>
        <span>© 2026 CommunalTable. Anonymous collaboration for better dining.</span>
        <div className="flex gap-4">
          <Link to="/about" className="hover:text-foreground">About</Link>
          <Link to="/help" className="hover:text-foreground">Help</Link>
          <Link to="/support" className="hover:text-foreground">Support</Link>
        </div>
      </div>
    </footer>
  );
}
