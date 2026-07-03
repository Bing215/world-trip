const STORAGE_KEY = "worldtripai.currentTrip";

export function saveTrip(trip) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...trip, savedState: "saved" }));
}

export function saveDraft(trip) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
}

export function loadTrip() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearTrip() {
  localStorage.removeItem(STORAGE_KEY);
}
