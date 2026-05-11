// Lightweight on-device sentiment + cuisine extraction.
// Stored in localStorage per city — used to bias future recommendations.
import type { FeedbackBoost } from "./recommend";

const POSITIVE = ["love", "loved", "great", "amazing", "excellent", "delicious", "tasty", "yum", "fantastic", "perfect", "best", "favorite", "favourite", "awesome", "good", "happy", "enjoyed"];
const NEGATIVE = ["bad", "worst", "hate", "hated", "awful", "boring", "stale", "bland", "disappointed", "disappointing", "expensive", "overpriced", "rude", "slow", "cold", "soggy", "not great", "didn't like", "didnt like"];

const KNOWN_CUISINES = [
  "north indian", "south indian", "chinese", "biryani", "pizzas", "pizza",
  "italian", "continental", "fast food", "desserts", "bakery", "beverages",
  "mughlai", "punjabi", "thalis", "thali", "healthy food", "snacks",
  "ice cream", "pastas", "pasta", "burgers", "burger", "cafe", "seafood",
  "mexican", "thai", "japanese", "sushi", "sandwich", "rolls", "kebab",
  "tandoori", "dosa", "idli",
];

export type ParsedFeedback = {
  sentiment: number; // -1..1
  liked: string[];
  disliked: string[];
};

export function parseFeedback(text: string): ParsedFeedback {
  const t = " " + text.toLowerCase() + " ";
  let pos = 0, neg = 0;
  for (const w of POSITIVE) if (t.includes(" " + w + " ") || t.includes(w + ".") || t.includes(w + "!")) pos++;
  for (const w of NEGATIVE) if (t.includes(w)) neg++;
  const total = pos + neg;
  const sentiment = total === 0 ? 0 : (pos - neg) / total;

  // Naive: cuisines mentioned near a negation become disliked, otherwise liked
  const mentioned = KNOWN_CUISINES.filter((c) => t.includes(c));
  const liked: string[] = [];
  const disliked: string[] = [];
  for (const c of mentioned) {
    const idx = t.indexOf(c);
    const window = t.slice(Math.max(0, idx - 30), idx);
    const negated = NEGATIVE.some((w) => window.includes(w)) || /\b(not|no|didn'?t)\b/.test(window);
    if (negated) disliked.push(titleCase(c));
    else liked.push(titleCase(c));
  }
  // If no cuisines mentioned, fall back to overall sentiment with no cuisine bias
  return { sentiment, liked: dedup(liked), disliked: dedup(disliked) };
}

function dedup(a: string[]): string[] { return Array.from(new Set(a)); }
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

const KEY_PREFIX = "ct.feedback.";

export function saveFeedback(city: string, parsed: ParsedFeedback) {
  try {
    const key = KEY_PREFIX + city.toLowerCase();
    const existing = loadBoost(city);
    const merged: FeedbackBoost = {
      liked: dedup([...existing.liked, ...parsed.liked]),
      disliked: dedup([...existing.disliked, ...parsed.disliked]),
    };
    localStorage.setItem(key, JSON.stringify(merged));
  } catch { /* ignore */ }
}

export function loadBoost(city: string): FeedbackBoost {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + city.toLowerCase());
    if (!raw) return { liked: [], disliked: [] };
    return JSON.parse(raw) as FeedbackBoost;
  } catch {
    return { liked: [], disliked: [] };
  }
}

export function clearFeedback(city: string) {
  try { localStorage.removeItem(KEY_PREFIX + city.toLowerCase()); } catch { /* ignore */ }
}
