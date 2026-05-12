// MCDM (Multi-Criteria Decision Making) scoring per the project spec.
// Score = wC*Cuisine + wB*Budget + wR*Rating + wD*Distance, all normalized to 0..1.
import type { Restaurant } from "./recommend";

export const WEIGHTS = { cuisine: 0.35, budget: 0.2, rating: 0.25, distance: 0.2 } as const;

export function cuisineSubscore(
  r: Restaurant,
  cuisineVotes: Map<string, number>,
  themeBoost: Set<string>,
  liked: Set<string>,
  disliked: Set<string>,
  totalVoters: number,
): number {
  let s = 0;
  let max = 0;
  for (const c of r.q) {
    const cl = c.toLowerCase();
    const v = cuisineVotes.get(c) ?? 0;
    s += v / Math.max(1, totalVoters);
    if (themeBoost.has(cl)) s += 0.4;
    if (liked.has(cl)) s += 0.3;
    if (disliked.has(cl)) s -= 0.6;
    max += 1.7;
  }
  if (max === 0) return 0;
  return clamp01(s / Math.max(1, r.q.length) * 1.4);
}

export function budgetSubscore(r: Restaurant, budgetCap: number): number {
  if (r.p > budgetCap) return 0;
  // Prefer prices in the 50–95% range of cap (good value, not too cheap).
  const ratio = r.p / Math.max(1, budgetCap);
  if (ratio >= 0.5 && ratio <= 0.95) return 1;
  if (ratio < 0.5) return 0.6 + ratio * 0.4 / 0.5;
  return Math.max(0, 1 - (ratio - 0.95) * 6);
}

export function ratingSubscore(r: Restaurant): number {
  // Map 0..5 to 0..1, with curve favoring 4+
  return clamp01((r.r - 2.5) / 2.5);
}

export function distanceSubscore(km: number | null, radiusKm = 5): number {
  if (km == null) return 0.5; // unknown distance, neutral
  if (km <= 0.5) return 1;
  if (km >= radiusKm * 3) return 0;
  if (km <= radiusKm) return 1 - (km / radiusKm) * 0.4; // 1.0 → 0.6 within radius
  return Math.max(0, 0.6 - ((km - radiusKm) / (radiusKm * 2)) * 0.6);
}

export function compositeScore(parts: {
  cuisine: number; budget: number; rating: number; distance: number;
}): number {
  const s =
    WEIGHTS.cuisine * parts.cuisine +
    WEIGHTS.budget * parts.budget +
    WEIGHTS.rating * parts.rating +
    WEIGHTS.distance * parts.distance;
  return Math.round(clamp01(s) * 100); // percentage 0..100
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
