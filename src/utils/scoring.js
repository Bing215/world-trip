export function scorePoi(poi, preferences, context = {}) {
  let score = poi.popularityScore || 50;
  for (const interest of preferences.interests || []) {
    if (poi.tags.includes(interest) || poi.type === normalizeInterestType(interest)) {
      score += 24;
    }
  }
  if (preferences.pace === "relaxed" && poi.durationMinutes <= 120) score += 8;
  if (preferences.avoid?.includes("too many museums") && poi.type === "museum") score -= 18;
  if (context.area && poi.area === context.area) score += 16;
  if (context.type && poi.type === context.type) score += 20;
  if (context.excludeIds?.includes(poi.id)) score -= 999;
  return score;
}

export function normalizeInterestType(interest) {
  const map = {
    museum: "museum",
    walk: "neighborhood",
    "afternoon-tea": "afternoon_tea",
    market: "market",
    food: "restaurant",
    "nearby-town": "day_trip"
  };
  return map[interest] || interest;
}

export function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
