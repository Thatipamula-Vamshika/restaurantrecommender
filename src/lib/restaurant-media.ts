// Curated Unsplash food/restaurant photos (direct CDN URLs, license-free)
const PHOTOS = [
  "photo-1517248135467-4c7edcad34c4", // restaurant interior
  "photo-1555396273-367ea4eb4db5", // food spread
  "photo-1504674900247-0877df9cc836", // burger
  "photo-1540189549336-e6e99c3679fe", // salad
  "photo-1565299624946-b28f40a0ae38", // pizza
  "photo-1551782450-a2132b4ba21d", // burger 2
  "photo-1567620905732-2d1ec7ab7445", // pancakes
  "photo-1565958011703-44f9829ba187", // bowl
  "photo-1546069901-ba9599a7e63c", // bowl 2
  "photo-1473093295043-cdd812d0e601", // table spread
  "photo-1414235077428-338989a2e8c0", // dim restaurant
  "photo-1559339352-11d035aa65de", // cafe
  "photo-1466978913421-dad2ebd01d17", // dessert
  "photo-1481931098730-318b6f776db0", // breakfast
  "photo-1528605248644-14dd04022da1", // steak
  "photo-1551218808-94e220e084d2", // tacos
  "photo-1529042410759-befb1204b468", // indian thali
  "photo-1601050690597-df0568f70950", // biryani
  "photo-1574484284002-952d92456975", // chinese
  "photo-1414235077428-338989a2e8c1", // sushi-ish
];

export function photoFor(seed: number | string, w = 800): string {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const id = PHOTOS[h % PHOTOS.length];
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
}

export function mapsLink(name: string, address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;
}

export function menuSearchLink(name: string, city: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${name} ${city} menu`)}`;
}
