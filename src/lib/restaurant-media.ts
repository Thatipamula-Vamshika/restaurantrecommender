// Curated Unsplash food/restaurant photos, grouped by category so we can
// pick a contextually-relevant image for each restaurant.

const POOLS: Record<string, string[]> = {
  biryani: [
    "photo-1601050690597-df0568f70950", // biryani
    "photo-1631452180519-c014fe946bc7",
    "photo-1633945274405-b6c8069047b0",
    "photo-1589302168068-964664d93dc0",
  ],
  pizza: [
    "photo-1565299624946-b28f40a0ae38",
    "photo-1574071318508-1cdbab80d002",
    "photo-1513104890138-7c749659a591",
    "photo-1604068549290-dea0e4a305ca",
  ],
  burger: [
    "photo-1568901346375-23c9450c58cd",
    "photo-1551782450-a2132b4ba21d",
    "photo-1550317138-10000687a72b",
    "photo-1586190848861-99aa4a171e90",
  ],
  chinese: [
    "photo-1563379091339-03b21ab4a4f8",
    "photo-1525755662778-989d0524087e",
    "photo-1585032226651-759b368d7246",
    "photo-1607330289024-1535c6b4e1c1",
  ],
  southIndian: [
    "photo-1630383249896-424e482df921", // dosa
    "photo-1668236543090-82eba5ee5976",
    "photo-1589301760014-d929f3979dbc",
    "photo-1610192244261-3f33de3f55e4",
  ],
  thali: [
    "photo-1529042410759-befb1204b468",
    "photo-1567188040759-fb8a883dc6d8",
    "photo-1631452180775-b18a7e8e2253",
    "photo-1606491956689-2ea866880c84",
  ],
  northIndian: [
    "photo-1628294895950-9805252327bc", // butter chicken
    "photo-1585937421612-70a008356fbe",
    "photo-1565557623262-b51c2513a641",
    "photo-1589647363585-f4a7d3877b10",
  ],
  italian: [
    "photo-1551183053-bf91a1d81141",
    "photo-1473093295043-cdd812d0e601",
    "photo-1556761223-4c4282c73f77",
    "photo-1572441713132-c542fc4fe282",
  ],
  cafe: [
    "photo-1559339352-11d035aa65de",
    "photo-1453614512568-c4024d13c247",
    "photo-1497935586351-b67a49e012bf",
    "photo-1521017432531-fbd92d768814",
  ],
  desserts: [
    "photo-1488477181946-6428a0291777",
    "photo-1551024506-0bccd828d307",
    "photo-1563729784474-d77dbb933a9e",
    "photo-1606313564200-e75d5e30476c",
  ],
  beverages: [
    "photo-1544145945-f90425340c7e",
    "photo-1497534446932-c925b458314e",
    "photo-1497636577773-f1231844b336",
    "photo-1572490122747-3968b75cc699",
  ],
  fastfood: [
    "photo-1561758033-d89a9ad46330",
    "photo-1606755962773-d324e0a13086",
    "photo-1548340748-6d2b7d7da280",
    "photo-1626700051175-6818013e1d4f",
  ],
  healthy: [
    "photo-1490645935967-10de6ba17061",
    "photo-1540189549336-e6e99c3679fe",
    "photo-1546069901-ba9599a7e63c",
    "photo-1505253716362-afaea1d3d1af",
  ],
  seafood: [
    "photo-1559737558-2f5a35f4523b",
    "photo-1559339352-c6cdd4f64e0d",
    "photo-1611599537845-1c7aca0091c0",
    "photo-1599487488170-d11ec9c172f0",
  ],
  bakery: [
    "photo-1558961363-fa8fdf82db35",
    "photo-1509440159596-0249088772ff",
    "photo-1586444248902-2f64eddc13df",
    "photo-1517433367423-c7e5b0f35086",
  ],
  default: [
    "photo-1517248135467-4c7edcad34c4", // restaurant interior
    "photo-1414235077428-338989a2e8c0", // dim restaurant
    "photo-1555396273-367ea4eb4db5", // food spread
    "photo-1466978913421-dad2ebd01d17",
    "photo-1481931098730-318b6f776db0",
    "photo-1528605248644-14dd04022da1",
  ],
};

const CUISINE_TO_POOL: { match: RegExp; pool: keyof typeof POOLS }[] = [
  { match: /biryani|hyderabadi|kebab/i, pool: "biryani" },
  { match: /pizza/i, pool: "pizza" },
  { match: /burger/i, pool: "burger" },
  { match: /chinese|thai|asian|noodle/i, pool: "chinese" },
  { match: /south indian|dosa|idli|kerala|tamil|andhra/i, pool: "southIndian" },
  { match: /thali|gujarati|rajasthani/i, pool: "thali" },
  { match: /north indian|punjabi|mughlai|tandoor/i, pool: "northIndian" },
  { match: /italian|pasta|continental/i, pool: "italian" },
  { match: /cafe|coffee/i, pool: "cafe" },
  { match: /dessert|sweet|ice ?cream|cake|kulfi/i, pool: "desserts" },
  { match: /beverage|juice|shake|tea/i, pool: "beverages" },
  { match: /fast food|street|chaat|snack|wrap|roll/i, pool: "fastfood" },
  { match: /healthy|salad|vegan|protein/i, pool: "healthy" },
  { match: /seafood|coastal|mangalorean|goan/i, pool: "seafood" },
  { match: /bakery/i, pool: "bakery" },
];

function poolFor(cuisines?: string[]): string[] {
  if (cuisines?.length) {
    const blob = cuisines.join(" ");
    for (const { match, pool } of CUISINE_TO_POOL) {
      if (match.test(blob)) return POOLS[pool];
    }
  }
  return POOLS.default;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function photoFor(seed: number | string, w = 800, cuisines?: string[]): string {
  const pool = poolFor(cuisines);
  const id = pool[hash(String(seed)) % pool.length];
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
}

export function mapsLink(name: string, address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;
}

export function menuSearchLink(name: string, city: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(
    `${name} ${city} menu site:zomato.com OR site:swiggy.com`,
  )}`;
}

export function fullMenuLink(name: string, city: string): string {
  // Direct Zomato search — usually lands on the restaurant page with full menu
  return `https://www.zomato.com/${encodeURIComponent(city.toLowerCase())}/restaurants?q=${encodeURIComponent(name)}`;
}
