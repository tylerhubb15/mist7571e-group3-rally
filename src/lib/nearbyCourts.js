import { importLibrary } from "@googlemaps/js-api-loader";

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Google Places API (New) Text Search. Requires "Places API (New)" enabled
 * on the same Google Cloud project as VITE_GOOGLE_MAPS_API_KEY — same key,
 * no separate credential, but it's a distinct API that has to be turned on.
 *
 * The only source of dynamic courts — an OpenStreetMap/Overpass fallback
 * was tried and dropped: it only ever returns a leisure=pitch/sport=tennis
 * tag with no name/address/rating on most real-world entries, which read
 * as a nameless pin with nothing to show in the detail panel. Places gives
 * a real name and formatted address every time, so a Places outage now
 * just means no dynamic courts for that search rather than degraded ones.
 */
export async function fetchNearbyCourts(lat, lng) {
  if (!MAPS_API_KEY) return { courts: [] };

  const { Place } = await importLibrary("places");
  const { places } = await Place.searchByText({
    textQuery: "tennis courts",
    fields: ["id", "displayName", "location", "formattedAddress", "rating"],
    locationBias: { lat, lng },
    maxResultCount: 20,
  });

  const courts = (places || [])
    .filter((p) => p.location)
    .map((p) => ({
      id: `places:${p.id}`,
      name: p.displayName || "Tennis court",
      lat: p.location.lat(),
      lng: p.location.lng(),
      source: "places",
      address: p.formattedAddress ?? null,
      rating: p.rating ?? null,
      surfaces: null,
      lit: null,
      courts: null,
      desc: null,
    }));

  return { courts };
}
