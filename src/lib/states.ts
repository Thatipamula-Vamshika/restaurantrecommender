// Curated India state → major cities map (cities present in Swiggy dataset).
export const STATE_CITIES: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Kurnool", "Rajahmundry", "Kakinada"],
  "Telangana": ["Hyderabad", "Secunderabad", "Warangal", "Karimnagar", "Nizamabad"],
  "Karnataka": ["Bangalore", "Mysore", "Mangalore", "Hubli", "Belgaum", "Davangere"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Trichy", "Tirunelveli", "Vellore"],
  "Kerala": ["Kochi", "Trivandrum", "Kozhikode", "Thrissur", "Kollam", "Kannur"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad", "Kolhapur", "Solapur"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar"],
  "Rajasthan": ["Jaipur", "Udaipur", "Jodhpur", "Kota", "Ajmer", "Bikaner"],
  "Delhi": ["Delhi", "New Delhi"],
  "Haryana": ["Gurgaon", "Faridabad", "Panipat", "Karnal", "Hisar", "Ambala"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Chandigarh"],
  "Uttar Pradesh": ["Lucknow", "Noida", "Ghaziabad", "Kanpur", "Agra", "Varanasi", "Allahabad", "Meerut", "Bareilly"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Gwalior", "Jabalpur", "Ujjain"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Puri", "Rourkela"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Haldwani"],
  "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala"],
  "Goa": ["Panaji", "Margao", "Vasco"],
};

export const ALL_STATES = Object.keys(STATE_CITIES).sort();

export function stateForCity(city: string): string | null {
  const c = city.trim().toLowerCase();
  for (const [st, cities] of Object.entries(STATE_CITIES)) {
    if (cities.some((x) => x.toLowerCase() === c)) return st;
  }
  return null;
}
