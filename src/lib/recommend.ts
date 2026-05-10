export type Restaurant = {
  i: number;
  n: string;
  c: string;
  r: number;
  p: number;
  q: string[];
  a: string;
};

export type Theme = "family" | "pet" | "romantic" | "casual";

export type MemberPrefs = {
  cuisines: string[];
  budgetMax: number;
  allergies: string[]; // lowercased cuisine/keyword tokens to exclude
};

export const THEMES: { id: Theme; label: string; emoji: string; boost: string[] }[] = [
  { id: "family", label: "Family-friendly", emoji: "👨‍👩‍👧", boost: ["Thalis", "South Indian", "North Indian", "Sweets", "Bakery"] },
  { id: "pet", label: "Pet-friendly", emoji: "🐶", boost: ["Cafe", "Continental", "Beverages", "Bakery", "Healthy Food"] },
  { id: "romantic", label: "Romantic", emoji: "🌹", boost: ["Italian", "Continental", "Pastas", "Desserts", "Mediterranean"] },
  { id: "casual", label: "Casual hangout", emoji: "🍔", boost: ["Pizzas", "Fast Food", "Chinese", "Burgers", "Snacks", "Beverages"] },
];

export const ALLERGY_MAP: Record<string, string[]> = {
  // allergy id -> cuisines/keywords to filter out
  dairy: ["ice cream", "desserts", "sweets", "bakery", "kulfi"],
  gluten: ["pizzas", "pastas", "bakery", "burgers", "sandwich", "rolls"],
  nuts: ["sweets", "desserts", "mughlai"],
  seafood: ["seafood", "kerala", "coastal", "mangalorean", "goan"],
  egg: ["bakery", "desserts"],
  shellfish: ["seafood", "chinese", "thai"],
};

export function recommend(
  catalog: Restaurant[],
  members: MemberPrefs[],
  theme: Theme,
  city?: string,
  cityList?: string[],
): { picks: Restaurant[]; fallback: boolean } {
  if (!members.length) return { picks: [], fallback: false };

  // Aggregate cuisine votes
  const cuisineVotes = new Map<string, number>();
  members.forEach((m) =>
    m.cuisines.forEach((c) => cuisineVotes.set(c, (cuisineVotes.get(c) ?? 0) + 1)),
  );

  // Group budget = min of maxes (fairness: don't exceed anyone's cap)
  const budgetCap = Math.min(...members.map((m) => m.budgetMax));

  // Combined allergy exclusion tokens
  const excluded = new Set<string>();
  members.forEach((m) =>
    m.allergies.forEach((a) =>
      (ALLERGY_MAP[a] ?? [a]).forEach((tok) => excluded.add(tok.toLowerCase())),
    ),
  );

  const themeBoost = new Set(
    THEMES.find((t) => t.id === theme)!.boost.map((s) => s.toLowerCase()),
  );

  const cityNorm = city?.trim().toLowerCase();
  const cityListNorm = cityList?.map((c) => c.toLowerCase());

  const scored = catalog
    .filter((r) => r.p <= budgetCap)
    .filter((r) => {
      const c = r.c.toLowerCase();
      if (cityNorm) return c.includes(cityNorm);
      if (cityListNorm && cityListNorm.length) return cityListNorm.some((x) => c.includes(x));
      return true;
    })
    .filter((r) => {
      // allergy-aware: drop if any cuisine matches an excluded token
      const blob = r.q.join(" ").toLowerCase();
      for (const tok of excluded) if (blob.includes(tok)) return false;
      return true;
    })
    .map((r) => {
      let score = 0;
      // votes for matching cuisines
      r.q.forEach((c) => {
        const v = cuisineVotes.get(c) ?? 0;
        score += v * 10;
      });
      // theme contextual boost
      r.q.forEach((c) => {
        if (themeBoost.has(c.toLowerCase())) score += 6;
      });
      // rating quality
      score += (r.r - 3) * 4;
      // budget fit (cheaper headroom slightly preferred)
      score += Math.max(0, (budgetCap - r.p) / budgetCap) * 2;
      return { r, score };
    })
    .sort((a, b) => b.score - a.score);

  const matched = scored.filter((x) => x.score > 0).slice(0, 3).map((x) => x.r);
  if (matched.length >= 3) return { picks: matched, fallback: false };

  const startedEmpty = matched.length === 0;
  const safe = catalog
    .filter((r) => r.p <= budgetCap)
    .filter((r) => {
      const c = r.c.toLowerCase();
      if (cityNorm) return c.includes(cityNorm);
      if (cityListNorm && cityListNorm.length) return cityListNorm.some((x) => c.includes(x));
      return true;
    })
    .filter((r) => {
      const blob = r.q.join(" ").toLowerCase();
      for (const tok of excluded) if (blob.includes(tok)) return false;
      return true;
    })
    .sort((a, b) => b.r - a.r);

  const seen = new Set(matched.map((m) => m.i));
  for (const r of safe) {
    if (seen.has(r.i)) continue;
    matched.push(r);
    if (matched.length >= 3) break;
  }
  return { picks: matched, fallback: startedEmpty };
}
