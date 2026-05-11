export type Restaurant = {
  i: number;
  n: string;
  c: string;
  r: number;
  p: number;
  q: string[];
  a: string;
};

export type Theme =
  | "family" | "pet" | "romantic" | "casual"
  | "birthday" | "business" | "latenight" | "brunch" | "solo" | "healthy";

export type MemberPrefs = {
  cuisines: string[];
  budgetMax: number;
  allergies: string[]; // lowercased tokens to exclude
};

export type FeedbackBoost = {
  liked: string[];     // cuisines to boost
  disliked: string[];  // cuisines to penalize
};

export const THEMES: { id: Theme; label: string; emoji: string; boost: string[] }[] = [
  { id: "family", label: "Family-friendly", emoji: "👨‍👩‍👧", boost: ["Thalis", "South Indian", "North Indian", "Sweets", "Bakery"] },
  { id: "pet", label: "Pet-friendly", emoji: "🐶", boost: ["Cafe", "Continental", "Beverages", "Bakery", "Healthy Food"] },
  { id: "romantic", label: "Romantic", emoji: "🌹", boost: ["Italian", "Continental", "Pastas", "Desserts", "Mediterranean"] },
  { id: "casual", label: "Casual hangout", emoji: "🍔", boost: ["Pizzas", "Fast Food", "Chinese", "Burgers", "Snacks", "Beverages"] },
  { id: "birthday", label: "Birthday party", emoji: "🎂", boost: ["Pizzas", "Desserts", "Bakery", "Ice Cream", "Continental", "Cafe"] },
  { id: "business", label: "Business lunch", emoji: "💼", boost: ["Continental", "North Indian", "Thalis", "Healthy Food", "Italian"] },
  { id: "latenight", label: "Late night", emoji: "🌙", boost: ["Fast Food", "Biryani", "Mughlai", "Burgers", "Chinese"] },
  { id: "brunch", label: "Weekend brunch", emoji: "🥞", boost: ["Cafe", "Bakery", "Continental", "Beverages", "Healthy Food", "Desserts"] },
  { id: "solo", label: "Solo treat", emoji: "🧘", boost: ["Cafe", "Bakery", "Beverages", "Desserts", "Healthy Food"] },
  { id: "healthy", label: "Healthy bowl", emoji: "🥗", boost: ["Healthy Food", "Salads", "Cafe", "Continental"] },
];

export const ALLERGY_MAP: Record<string, string[]> = {
  dairy: ["ice cream", "desserts", "sweets", "bakery", "kulfi"],
  gluten: ["pizzas", "pastas", "bakery", "burgers", "sandwich", "rolls"],
  nuts: ["sweets", "desserts", "mughlai"],
  seafood: ["seafood", "kerala", "coastal", "mangalorean", "goan"],
  egg: ["bakery", "desserts"],
  shellfish: ["seafood", "chinese", "thai"],
};

function matchesPlace(r: Restaurant, cityNorm?: string, cityListNorm?: string[]): boolean {
  const c = r.c.toLowerCase();
  if (cityNorm) return c.includes(cityNorm);
  if (cityListNorm && cityListNorm.length) return cityListNorm.some((x) => c.includes(x));
  return true;
}

export function recommend(
  catalog: Restaurant[],
  members: MemberPrefs[],
  theme: Theme,
  city?: string,
  cityList?: string[],
  feedback?: FeedbackBoost,
  cityDefaults?: Record<string, number[]>,
): { picks: Restaurant[]; fallback: boolean } {
  if (!members.length) return { picks: [], fallback: false };

  const cuisineVotes = new Map<string, number>();
  members.forEach((m) =>
    m.cuisines.forEach((c) => cuisineVotes.set(c, (cuisineVotes.get(c) ?? 0) + 1)),
  );

  const budgetCap = Math.min(...members.map((m) => m.budgetMax));

  const excluded = new Set<string>();
  members.forEach((m) =>
    m.allergies.forEach((a) =>
      (ALLERGY_MAP[a] ?? [a]).forEach((tok) => excluded.add(tok.toLowerCase())),
    ),
  );

  const themeBoost = new Set(
    THEMES.find((t) => t.id === theme)!.boost.map((s) => s.toLowerCase()),
  );
  const liked = new Set((feedback?.liked ?? []).map((s) => s.toLowerCase()));
  const disliked = new Set((feedback?.disliked ?? []).map((s) => s.toLowerCase()));

  const cityNorm = city?.trim().toLowerCase();
  const cityListNorm = cityList?.map((c) => c.toLowerCase());

  const allergySafe = (r: Restaurant) => {
    const blob = r.q.join(" ").toLowerCase();
    for (const tok of excluded) if (blob.includes(tok)) return false;
    return true;
  };

  const scored = catalog
    .filter((r) => r.p <= budgetCap)
    .filter((r) => matchesPlace(r, cityNorm, cityListNorm))
    .filter(allergySafe)
    .map((r) => {
      let score = 0;
      r.q.forEach((c) => {
        const cl = c.toLowerCase();
        const v = cuisineVotes.get(c) ?? 0;
        score += v * 10;
        if (themeBoost.has(cl)) score += 6;
        if (liked.has(cl)) score += 5;
        if (disliked.has(cl)) score -= 8;
      });
      score += (r.r - 3) * 4;
      score += Math.max(0, (budgetCap - r.p) / budgetCap) * 2;
      return { r, score };
    })
    .sort((a, b) => b.score - a.score);

  const matched = scored.filter((x) => x.score > 0).slice(0, 3).map((x) => x.r);
  if (matched.length >= 3) return { picks: matched, fallback: false };

  const startedEmpty = matched.length === 0;

  // Fallback 1: top-rated allergy-safe in budget within place
  const safe = catalog
    .filter((r) => r.p <= budgetCap)
    .filter((r) => matchesPlace(r, cityNorm, cityListNorm))
    .filter(allergySafe)
    .sort((a, b) => b.r - a.r);

  const seen = new Set(matched.map((m) => m.i));
  for (const r of safe) {
    if (seen.has(r.i)) continue;
    matched.push(r); seen.add(r.i);
    if (matched.length >= 3) break;
  }
  if (matched.length >= 3) return { picks: matched, fallback: startedEmpty };

  // Fallback 2: per-city defaults (always returns something for the chosen city)
  if (cityDefaults && cityNorm) {
    const ids = cityDefaults[cityNorm] ?? [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      const r = catalog.find((x) => x.i === id);
      if (!r) continue;
      matched.push(r); seen.add(id);
      if (matched.length >= 3) break;
    }
  }
  if (cityDefaults && cityListNorm) {
    for (const cn of cityListNorm) {
      if (matched.length >= 3) break;
      const ids = cityDefaults[cn] ?? [];
      for (const id of ids) {
        if (seen.has(id)) continue;
        const r = catalog.find((x) => x.i === id);
        if (!r) continue;
        matched.push(r); seen.add(id);
        if (matched.length >= 3) break;
      }
    }
  }
  return { picks: matched, fallback: startedEmpty };
}
