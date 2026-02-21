import { API_BASE } from "./api";

export type GeoResult = { name: string; lat: number; lng: number };

export type PlaceSuggestion = { placeId: string; description: string };

export type PlaceDetails = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

// ----------------------
// Google Places-backed search (recommended)
// ----------------------
export async function placesAutocomplete(params: {
  query: string;
  near?: { lat: number; lng: number };
}) {
  const res = await fetch(`${API_BASE}/impact/places-autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(params),
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) throw new Error(data?.error || "Autocomplete failed");
  return data as { ok: true; suggestions: PlaceSuggestion[] };
}

export async function placeDetails(placeId: string) {
  const res = await fetch(`${API_BASE}/impact/place-details`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ placeId }),
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) throw new Error(data?.error || "Place details failed");
  return data as { ok: true; place: PlaceDetails };
}

// ----------------------
// Existing (OpenStreetMap) fallback
// ----------------------
export async function geoSearch(q: string) {
  const res = await fetch(`${API_BASE}/geo/search?q=${encodeURIComponent(q)}`, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Geo search failed");
  return data as { ok: true; results: GeoResult[] };
}

export async function submitImpact(form: FormData) {
  const res = await fetch(`${API_BASE}/impact/submit`, {
    method: "POST",
    headers: { "ngrok-skip-browser-warning": "true" },
    body: form,
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text.slice(0, 120));
  }
  if (!res.ok) throw new Error(data?.error || "Submit failed");
  return data;
}

export async function approveImpact(submissionId: string) {
  const res = await fetch(`${API_BASE}/impact/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ submissionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Approve failed");
  return data;
}