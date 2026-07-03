import { londonPoiPool } from "../data/londonPoiPool.js";
import { scorePoi, uniqueById } from "../utils/scoring.js";

export function retrieveCandidates(preferences, context = {}) {
  const scored = londonPoiPool
    .map((poi) => ({
      ...poi,
      score: scorePoi(poi, preferences, context)
    }))
    .filter((poi) => poi.score > 0)
    .sort((a, b) => b.score - a.score);

  return uniqueById(scored);
}

export function getById(poiId) {
  return londonPoiPool.find((poi) => poi.id === poiId);
}

export function getByType(type, limit = 5, context = {}) {
  return londonPoiPool
    .filter((poi) => poi.type === type)
    .map((poi) => ({ ...poi, score: scorePoi(poi, context.preferences || { interests: [] }, context) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getReplacementCandidates(poiId, trip) {
  const original = getById(poiId);
  if (!original) return [];
  const usedIds = new Set(trip.itineraryDays.flatMap((day) => day.items.map((item) => item.poiId)));
  return londonPoiPool
    .filter((poi) => poi.id !== poiId)
    .filter((poi) => !usedIds.has(poi.id))
    .map((poi) => {
      let score = poi.popularityScore;
      if (poi.type === original.type) score += 35;
      if (poi.area === original.area) score += 22;
      if (poi.tags.some((tag) => original.tags.includes(tag))) score += 12;
      if (original.type === "museum" && poi.tags.includes("small")) score += 10;
      return { ...poi, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
