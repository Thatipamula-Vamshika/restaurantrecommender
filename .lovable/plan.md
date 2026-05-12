## Plan — CommunalTable v4

### 1. Hero like gsap.com/showcase
- Replace current hero with a split layout:
  - **Left**: kinetic headline "CommunalTable" (already animated), tagline, CTA buttons (Start group / Join with code).
  - **Right**: a generated **3D isometric illustration of a secure database** (server stack with shield, glowing nodes, floating data cards) — produced via `imagegen` (premium), with a subtle continuous float + parallax tilt on mousemove (CSS + tiny JS, no GSAP dep).
- Keep marquee + floating photo strip lower on the page so the hero stays clean like the GSAP showcase.

### 2. Two ways to collect group input
- **Pass-the-device** (existing) — kept untouched.
- **Remote join via code** (new) — requires **Lovable Cloud**. Flow:
  1. Host clicks "Create remote group" → server fn generates a **6-char code** + `session_id` row in `group_sessions` table.
  2. QR + code shown; other phones open `/join/$code`, type their preferences, submit.
  3. Each submission inserts a row into `group_submissions` (anonymous, no user identity).
  4. Host page subscribes via Supabase **realtime** to `group_submissions` filtered by `session_id` and shows live "3 of 4 joined" — never showing individual answers.
  5. Host clicks "Generate" → recommendation runs over aggregated rows; session is deleted.
- Schema (RLS open for insert by anon, read scoped to session_id): `group_sessions(id, code, theme, city, lat, lng, created_at)`, `group_submissions(id, session_id, cuisines, budget_max, allergies, created_at)`.

### 3. Location: Haversine in text + map
- Keep Leaflet `MapPicker`.
- After the user picks a point (or auto-detect), display below the map:
  - "📍 {city}, {state}"
  - "📏 You are **X.XX km** from {nearest known city centroid}" — computed using the Haversine formula already in `src/lib/geo.ts`.
  - Restaurants in results show "**1.4 km away**" computed via the same formula (we synthesize a stable per-restaurant offset from city centroid using a deterministic hash, since the dataset has no real lat/lng — disclosed as "approx").

### 4. Backend per the uploaded modules document
Implement the algorithm spec exactly:
- **Distance Calculation Module** → `geo.ts` (already Haversine — confirm + extend filter-within-radius helper).
- **Ranking Module (MCDM / Weighted Linear Model)** → rewrite scoring in `src/lib/recommend.ts` to compute:
  ```
  Score = wC·Cuisine + wB·Budget + wR·Rating + wD·Distance
  ```
  with normalized 0..1 sub-scores and weights `wC=0.35, wB=0.20, wR=0.25, wD=0.20`. Each restaurant gets a **percentage score** displayed in the result card (matches uploaded mock: "Score: 92%").
- **Sentiment module** → keep current `feedback.ts`, expose its bias as `wF` boost layered on Cuisine score.
- **Privacy/session** → in-memory only (no individual answers ever stored beyond session row, which is deleted after generation).

### 5. Results UI to match the uploaded mock image
Restyle `/` results section:
- Left rail: **Group Preferences** card (Cuisine, Budget range, Group Size, Location) + **Filters Applied** card (Distance, Rating, Sort By) + **Edit Preferences** button.
- Right: **Top 3 Restaurant Recommendations** — each card shows photo, name, cuisine chip, distance, rating + reviews, one-line description, **Score: NN%** pill, **View Details** button.
- Bottom: "Showing results based on:" chips (Location, Cuisine, Budget, Reviews) + "See More Options" / "Select Restaurant" actions.
- Color tokens stay as-is; layout is composed from existing tokens so the rest of the site is unchanged.

### 6. In-app menu modal
- Keep the existing synthesized menu card on `/restaurant/$id`.
- "View full menu" no longer opens a new tab — it opens an **in-app modal with an iframe** to `https://www.google.com/search?q=...zomato OR swiggy menu` (Google itself is iframe-friendly; Zomato/Swiggy block direct embed). If iframe load fails, fall back to a "Open in new tab" link inside the modal.

### Files
**New**: `src/routes/join.$code.tsx`, `src/routes/host.$code.tsx`, `src/lib/session.functions.ts`, `src/lib/score.ts` (MCDM helpers), `src/components/MenuModal.tsx`, `src/components/HeroIsometric.tsx`, `src/assets/hero-database.png` (generated), Supabase migration for the two tables.
**Edited**: `src/routes/index.tsx` (hero + new results layout + remote-join CTA), `src/lib/recommend.ts` (MCDM scoring + return scores), `src/lib/geo.ts` (radius filter helper, deterministic per-restaurant offset), `src/routes/restaurant.$id.tsx` (menu modal).

### Out of scope
- Storing remote-join submissions long-term (deleted after generation).
- Real menu images per restaurant (still synthesized + iframe to Google search).
- Auth on join links — anyone with the code can submit (matches "anonymous").

Confirm and I'll build.