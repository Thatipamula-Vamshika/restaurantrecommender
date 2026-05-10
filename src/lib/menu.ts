// Plausible cuisine-based menus (the Swiggy dataset has no menu items).
// Used to render an "indicative menu" preview on result/restaurant pages.

const M: Record<string, { item: string; price: number }[]> = {
  "north indian": [
    { item: "Butter Chicken", price: 320 },
    { item: "Paneer Butter Masala", price: 280 },
    { item: "Dal Makhani", price: 220 },
    { item: "Garlic Naan", price: 70 },
    { item: "Veg Biryani", price: 240 },
    { item: "Tandoori Roti", price: 30 },
  ],
  "south indian": [
    { item: "Masala Dosa", price: 150 },
    { item: "Idli Sambar (4 pc)", price: 90 },
    { item: "Medu Vada (2 pc)", price: 80 },
    { item: "Filter Coffee", price: 60 },
    { item: "Curd Rice", price: 130 },
    { item: "Mysore Bonda", price: 90 },
  ],
  biryani: [
    { item: "Chicken Hyderabadi Biryani", price: 280 },
    { item: "Mutton Biryani", price: 360 },
    { item: "Veg Biryani", price: 200 },
    { item: "Egg Biryani", price: 220 },
    { item: "Raita", price: 40 },
  ],
  chinese: [
    { item: "Veg Hakka Noodles", price: 180 },
    { item: "Chicken Manchurian", price: 240 },
    { item: "Schezwan Fried Rice", price: 200 },
    { item: "Spring Rolls", price: 160 },
    { item: "Honey Chilli Potato", price: 180 },
  ],
  pizzas: [
    { item: "Margherita (Medium)", price: 320 },
    { item: "Farmhouse (Medium)", price: 480 },
    { item: "Peppy Paneer", price: 460 },
    { item: "Chicken Dominator", price: 580 },
    { item: "Garlic Bread", price: 140 },
  ],
  italian: [
    { item: "Penne Arrabbiata", price: 320 },
    { item: "Alfredo Pasta", price: 360 },
    { item: "Bruschetta", price: 220 },
    { item: "Lasagna", price: 380 },
    { item: "Tiramisu", price: 240 },
  ],
  pastas: [
    { item: "Spaghetti Aglio e Olio", price: 280 },
    { item: "Mac & Cheese", price: 320 },
    { item: "Pesto Pasta", price: 340 },
    { item: "Carbonara", price: 380 },
  ],
  continental: [
    { item: "Grilled Chicken Steak", price: 420 },
    { item: "Caesar Salad", price: 260 },
    { item: "Mushroom Risotto", price: 360 },
    { item: "Fish & Chips", price: 380 },
  ],
  "fast food": [
    { item: "Veg Burger", price: 90 },
    { item: "Cheese Burst Fries", price: 140 },
    { item: "Chicken Wrap", price: 180 },
    { item: "Cold Coffee", price: 120 },
  ],
  burgers: [
    { item: "Classic Cheeseburger", price: 180 },
    { item: "Crispy Chicken Burger", price: 220 },
    { item: "Veg Patty Burger", price: 140 },
  ],
  desserts: [
    { item: "Gulab Jamun (2 pc)", price: 80 },
    { item: "Choco Lava Cake", price: 140 },
    { item: "Brownie with Ice Cream", price: 180 },
  ],
  sweets: [
    { item: "Rasgulla (2 pc)", price: 60 },
    { item: "Kaju Katli (250g)", price: 320 },
    { item: "Jalebi (250g)", price: 140 },
  ],
  bakery: [
    { item: "Chocolate Pastry", price: 90 },
    { item: "Veg Puff", price: 40 },
    { item: "Black Forest Slice", price: 120 },
  ],
  beverages: [
    { item: "Cold Coffee", price: 120 },
    { item: "Mango Shake", price: 100 },
    { item: "Lemonade", price: 70 },
    { item: "Masala Chai", price: 30 },
  ],
  cafe: [
    { item: "Cappuccino", price: 160 },
    { item: "Avocado Toast", price: 280 },
    { item: "Banoffee Pie", price: 220 },
  ],
  mughlai: [
    { item: "Chicken Korma", price: 320 },
    { item: "Mutton Rogan Josh", price: 420 },
    { item: "Sheermal", price: 60 },
  ],
  punjabi: [
    { item: "Sarson Da Saag + Makki Roti", price: 240 },
    { item: "Amritsari Chole Bhature", price: 180 },
    { item: "Lassi", price: 80 },
  ],
  thalis: [
    { item: "Veg Thali (Unlimited)", price: 280 },
    { item: "Special Non-Veg Thali", price: 380 },
  ],
  snacks: [
    { item: "Samosa (2 pc)", price: 40 },
    { item: "Pav Bhaji", price: 130 },
    { item: "Bhel Puri", price: 80 },
  ],
  chaat: [
    { item: "Pani Puri", price: 60 },
    { item: "Dahi Puri", price: 90 },
    { item: "Aloo Tikki", price: 70 },
  ],
  "ice cream": [
    { item: "Belgian Chocolate Scoop", price: 140 },
    { item: "Sundae Special", price: 220 },
  ],
  "healthy food": [
    { item: "Quinoa Salad", price: 280 },
    { item: "Grilled Veg Bowl", price: 240 },
    { item: "Protein Smoothie", price: 220 },
  ],
  indian: [
    { item: "Chef's Special Thali", price: 260 },
    { item: "Paneer Tikka", price: 280 },
    { item: "Tandoori Chicken (Half)", price: 320 },
  ],
  seafood: [
    { item: "Goan Fish Curry", price: 360 },
    { item: "Prawns Masala", price: 420 },
    { item: "Grilled Pomfret", price: 480 },
  ],
};

export function menuFor(cuisines: string[], cap = 8): { item: string; price: number }[] {
  const out: { item: string; price: number }[] = [];
  const seen = new Set<string>();
  for (const c of cuisines) {
    const key = c.toLowerCase();
    const items = M[key];
    if (!items) continue;
    for (const it of items) {
      if (seen.has(it.item)) continue;
      seen.add(it.item);
      out.push(it);
      if (out.length >= cap) return out;
    }
  }
  if (!out.length) {
    return [
      { item: "Chef's Special", price: 260 },
      { item: "Soup of the Day", price: 140 },
      { item: "House Salad", price: 180 },
      { item: "Fresh Lime Soda", price: 60 },
    ];
  }
  return out;
}
