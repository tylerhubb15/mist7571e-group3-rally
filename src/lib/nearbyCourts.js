import { importLibrary } from "@googlemaps/js-api-loader";

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const METERS_PER_MILE = 1609.34;
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Google Places API (New) Text Search. Requires "Places API (New)" enabled
 * on the same Google Cloud project as VITE_GOOGLE_MAPS_API_KEY — same key,
 * no separate credential, but it's a distinct API that has to be turned on.
 */
async function fetchPlacesCourts(lat, lng) {
  const { Place } = await importLibrary("places");
  const { places } = await Place.searchByText({
    textQuery: "tennis courts",
    fields: ["id", "displayName", "location", "formattedAddress", "rating"],
    locationBias: { lat, lng },
    maxResultCount: 20,
  });
  return (places || [])
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
}

/**
 * OpenStreetMap via the public Overpass API — free, no key. Coverage
 * varies by region but is generally solid in the US/Europe. Called
 * directly from the browser (not a server function): it's unauthenticated
 * so there's no secret to hide, and public Overpass mirrors are known to
 * rate-limit/block requests coming from cloud/datacenter IP ranges, which
 * a serverless function would look like — a real user's browser doesn't.
 */
async function fetchOverpassCourts(lat, lng, radiusMiles) {
  const radiusMeters = Math.round(radiusMiles * METERS_PER_MILE);
  const query = `[out:json][timeout:15];nwr["leisure"="pitch"]["sport"="tennis"](around:${radiusMeters},${lat},${lng});out center tags;`;
  const res = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass request failed (${res.status}).`);
  const data = await res.json();
  return (data.elements || [])
    .map((el) => {
      const point = el.type === "node" ? { lat: el.lat, lng: el.lon } : { lat: el.center?.lat, lng: el.center?.lon };
      const tags = el.tags || {};
      return {
        id: `osm:${el.type}/${el.id}`,
        name: tags.name || "Tennis court",
        lat: point.lat,
        lng: point.lng,
        source: "osm",
        address: null,
        rating: null,
        surfaces: tags.surface ? [capitalize(tags.surface)] : null,
        lit: tags.lit === "yes" ? true : tags.lit === "no" ? false : null,
        courts: null,
        desc: null,
      };
    })
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
}

/**
 * Google Places first (better names/ratings/addresses when it's configured
 * and working), falling back to Overpass — on a thrown error (key missing,
 * API not enabled, quota) or on a clean empty result. This is the actual
 * point of wiring up both: the feature keeps working even if one source is
 * unavailable, instead of a single point of failure.
 */
export async function fetchNearbyCourts(lat, lng, radiusMiles) {
  if (MAPS_API_KEY) {
    try {
      const places = await fetchPlacesCourts(lat, lng);
      if (places.length > 0) return { courts: places, source: "places" };
    } catch {
      // fall through to Overpass
    }
  }
  const osm = await fetchOverpassCourts(lat, lng, radiusMiles);
  return { courts: osm, source: "osm" };
}
