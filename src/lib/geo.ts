// Haversine distance + city centroids for cities present in the Swiggy dataset.
export const CITY_COORDS: Record<string, [number, number]> = {
  // Tier 1
  Mumbai: [19.076, 72.8777], Delhi: [28.6139, 77.209], "New Delhi": [28.6139, 77.209],
  Bangalore: [12.9716, 77.5946], Hyderabad: [17.385, 78.4867], Chennai: [13.0827, 80.2707],
  Kolkata: [22.5726, 88.3639], Pune: [18.5204, 73.8567], Ahmedabad: [23.0225, 72.5714],
  Jaipur: [26.9124, 75.7873], Lucknow: [26.8467, 80.9462], Surat: [21.1702, 72.8311],
  Kanpur: [26.4499, 80.3319], Nagpur: [21.1458, 79.0882], Indore: [22.7196, 75.8577],
  Bhopal: [23.2599, 77.4126], Patna: [25.5941, 85.1376], Gurgaon: [28.4595, 77.0266],
  Noida: [28.5355, 77.391], Ghaziabad: [28.6692, 77.4538], Faridabad: [28.4089, 77.3178],
  Thane: [19.2183, 72.9781], Navi: [19.033, 73.0297],
  // Karnataka/TN/Kerala
  Mysore: [12.2958, 76.6394], Mangalore: [12.9141, 74.856], Hubli: [15.3647, 75.124],
  Coimbatore: [11.0168, 76.9558], Madurai: [9.9252, 78.1198], Salem: [11.6643, 78.146],
  Trichy: [10.7905, 78.7047], Kochi: [9.9312, 76.2673], Trivandrum: [8.5241, 76.9366],
  Kozhikode: [11.2588, 75.7804], Thrissur: [10.5276, 76.2144], Kollam: [8.8932, 76.6141],
  // AP/Telangana
  Visakhapatnam: [17.6868, 83.2185], Vijayawada: [16.5062, 80.648], Guntur: [16.3067, 80.4365],
  Tirupati: [13.6288, 79.4192], Warangal: [17.9784, 79.5941], Secunderabad: [17.4399, 78.4983],
  // North
  Chandigarh: [30.7333, 76.7794], Mohali: [30.7046, 76.7179], Ludhiana: [30.901, 75.8573],
  Amritsar: [31.634, 74.8723], Jalandhar: [31.326, 75.5762], Patiala: [30.3398, 76.3869],
  Dehradun: [30.3165, 78.0322], Shimla: [31.1048, 77.1734], Manali: [32.2396, 77.1887],
  // West
  Vadodara: [22.3072, 73.1812], Rajkot: [22.3039, 70.8022], Gandhinagar: [23.2156, 72.6369],
  Nashik: [19.9975, 73.7898], Aurangabad: [19.8762, 75.3433], Kolhapur: [16.705, 74.2433],
  Udaipur: [24.5854, 73.7125], Jodhpur: [26.2389, 73.0243], Kota: [25.2138, 75.8648],
  Ajmer: [26.4499, 74.6399],
  // East
  Bhubaneswar: [20.2961, 85.8245], Cuttack: [20.4625, 85.8828], Guwahati: [26.1445, 91.7362],
  Ranchi: [23.3441, 85.3096], Jamshedpur: [22.8046, 86.2029], Howrah: [22.5958, 88.2636],
  Siliguri: [26.7271, 88.3953], Durgapur: [23.5204, 87.3119],
  // Goa/MP/UP/Misc
  Panaji: [15.4909, 73.8278], Margao: [15.2832, 73.9862], Gwalior: [26.2183, 78.1828],
  Jabalpur: [23.1815, 79.9864], Ujjain: [23.1765, 75.7885], Agra: [27.1767, 78.0081],
  Varanasi: [25.3176, 82.9739], Allahabad: [25.4358, 81.8463], Meerut: [28.9845, 77.7064],
  Bareilly: [28.367, 79.4304], Raipur: [21.2514, 81.6296], Bhilai: [21.1938, 81.3509],
};

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function nearestCity(
  lat: number,
  lon: number,
): { city: string; km: number } | null {
  let best: { city: string; km: number } | null = null;
  for (const [city, c] of Object.entries(CITY_COORDS)) {
    const d = haversineKm([lat, lon], c);
    if (!best || d < best.km) best = { city, km: d };
  }
  return best;
}

export function citiesWithinKm(
  lat: number,
  lon: number,
  km: number,
): { city: string; km: number }[] {
  return Object.entries(CITY_COORDS)
    .map(([city, c]) => ({ city, km: haversineKm([lat, lon], c) }))
    .filter((x) => x.km <= km)
    .sort((a, b) => a.km - b.km);
}
