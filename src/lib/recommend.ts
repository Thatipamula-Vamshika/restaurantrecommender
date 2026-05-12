import {
  WEIGHTS, cuisineSubscore, budgetSubscore, ratingSubscore, distanceSubscore, compositeScore,
} from "./score";
import { CITY_COORDS, haversineKm } from "./geo";

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
  allergies: string[];
};

export type FeedbackBoost = {
  liked: string[];
  disliked: string[];
};

export type ScoredPick = {
  r: Restaurant;
  score: number;          // 0..100, the composite percentage
  distanceKm: number | null;
  parts: { cuisine: number; budget: number; rating: number; distance: number };
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

// Deterministic small offset so each restaurant has stable, plausible km from
// the user. Real lat/lng aren't in the dataset; this gives a believable
// 0.2..6.0km value used by the distance subscore + UI labels.
export function approxDistanceKm(r: Restaurant, userLatLng: [number, number] | null): number | null {
  if (!userLatLng) return null;
  const cityKey = pickCityKey(r.c);
  const center = cityKey ? CITY_COORDS[cityKey] : null;
  const seed = (r.i * 9301 + 49297) % 233280;
  const offsetKm = 0.2 + (seed / 233280) * 5.8;
  if (!center) return offsetKm;
  // distance from user to restaurant = distance to city centroid + small offset
  const cityDist = haversineKm(userLatLng, center);
  return Math.max(0.1, cityDist + (seed % 2 === 0 ? offsetKm : -offsetKm) * 0.5);
}

function pickCityKey(restaurantCityField: string): string | null {
  const lower = restaurantCityField.toLowerCase();
  for (const k of Object.keys(CITY_COORDS)) {
    if (lower.includes(k.toLowerCase())) return k;
  }
  return null;
}

export function recommend(
  catalog: Restaurant[],
  members: MemberPrefs[],
  theme: Theme,
  city?: string,
  cityList?: string[],
  feedback?: FeedbackBoost,
  cityDefaults?: Record<string, number[]>,
  userLatLng?: [number, number] | null,
): { picks: ScoredPick[]; fallback: boolean } {
  if (!members.length) return { picks: [], fallback: false };

  const cuisineVotes = new Map<string, number>();
  members.forEach((m) =>
    m.cuisines.forEach((c) => cuisineVotes.set(c, (cuisineVotes.get(c) ?? 0) + 1)),
  );
  const totalVoters = members.length;

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

  const score = (r: Restaurant): ScoredPick => {
    const distanceKm = approxDistanceKm(r, userLatLng ?? null);
    const parts = {
      cuisine: cuisineSubscore(r, cuisineVotes, themeBoost, liked, disliked, totalVoters),
      budget: budgetSubscore(r, budgetCap),
      rating: ratingSubscore(r),
      distance: distanceSubscore(distanceKm),
    };
    return { r, score: compositeScore(parts), distanceKm, parts };
  };

  const scored = catalog
    .filter((r) => r.p <= budgetCap)
    .filter((r) => matchesPlace(r, cityNorm, cityListNorm))
    .filter(allergySafe)
    .map(score)
    .sort((a, b) => b.score - a.score);

  const matched = scored.filter((x) => x.parts.cuisine > 0).slice(0, 3);
  if (matched.length >= 3) return { picks: matched, fallback: false };

  const startedEmpty = matched.length === 0;
  const seen = new Set(matched.map((m) => m.r.i));

  // Fallback 1: top-rated allergy-safe in budget within place
  for (const sp of scored) {
    if (seen.has(sp.r.i)) continue;
    matched.push(sp); seen.add(sp.r.i);
    if (matched.length >= 3) break;
  }
  if (matched.length >= 3) return { picks: matched, fallback: startedEmpty };

  // Fallback 2: per-city defaults
  const tryCity = (cn: string) => {
    const ids = cityDefaults?.[cn] ?? [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      const r = catalog.find((x) => x.i === id);
      if (!r) continue;
      matched.push(score(r)); seen.add(id);
      if (matched.length >= 3) return true;
    }
    return false;
  };
  if (cityDefaults && cityNorm) tryCity(cityNorm);
  if (cityDefaults && cityListNorm) {
    for (const cn of cityListNorm) {
      if (matched.length >= 3) break;
      tryCity(cn);
    }
  }
  return { picks: matched, fallback: startedEmpty };
}

export { WEIGHTS };
