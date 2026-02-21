import { postJSON } from "./http";

export type PlaceSuggestion = { placeId: string; description: string };

export type PlaceDetails = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export async function placesAutocomplete(params: { query: string; near?: { lat: number; lng: number } }) {
  return postJSON<{ ok: true; suggestions: PlaceSuggestion[] }>("/impact/places-autocomplete", params);
}

export async function placeDetails(placeId: string) {
  return postJSON<{ ok: true; place: PlaceDetails }>("/impact/place-details", { placeId });
}

export async function submitDonation(params: { userId: string; imageUrl: string; place: PlaceDetails }) {
  return postJSON<{ ok: true; submission: any }>("/impact/submit-donation", params);
}