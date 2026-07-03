export const dayColors = ["#2764d8", "#2f8a62", "#d96c4a", "#8a54bf", "#b8871d"];

export function findItem(trip, itemId) {
  for (const day of trip.itineraryDays) {
    const item = day.items.find((entry) => entry.id === itemId);
    if (item) return { day, item };
  }
  return null;
}

export function findItemByPoiId(trip, poiId) {
  for (const day of trip.itineraryDays) {
    const item = day.items.find((entry) => entry.poiId === poiId);
    if (item) return { day, item };
  }
  return null;
}

export function buildMapMarkers(trip) {
  return trip.itineraryDays.flatMap((day, dayIndex) =>
    day.items.map((item, itemIndex) => ({
      id: item.id,
      poiId: item.poiId,
      label: `${day.day}.${itemIndex + 1}`,
      name: item.name,
      day: day.day,
      lat: item.lat,
      lng: item.lng,
      color: dayColors[dayIndex % dayColors.length]
    }))
  );
}

export function getBounds(markers) {
  const lats = markers.map((marker) => marker.lat);
  const lngs = markers.map((marker) => marker.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs)
  };
}
