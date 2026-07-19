import React, { useEffect, useRef, useState } from "react";
import { X, LocateFixed, Search, Loader2, Minus, Plus } from "lucide-react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { COURT_LOCS } from "../data/mockData.js";
import { useAllProfiles, useNearbyCourts } from "../hooks/hooks.jsx";
import { Avatar, Header, Loading, ErrorNote, Field } from "./Shared.jsx";
import { distanceMiles } from "../lib/geo.js";

const RADIUS_MIN = 3;
const RADIUS_MAX = 25;
// How close a player's own location has to be to a court to count as
// "at" it. Smaller than the ~1mi gap between the closest two seed courts
// so nearby-but-distinct courts don't double-count the same player.
const NEARBY_PLAYER_RADIUS_MI = 0.5;

// The city search box only accepts a city/state/country-level place — not
// a business, address, or point of interest. A term like "tennis court"
// can still resolve to *something* (Google's Geocoder is lenient and may
// match a specific court's street address instead of erroring), which
// would silently set the location to a random result rather than what the
// user meant. Checking the result's own `types` against Google's
// place-level categories catches this regardless of what the raw input
// text looks like — a plain string match can't tell "tennis court" apart
// from a legitimate two-word city like "New York".
const PLACE_LEVEL_TYPES = new Set([
  "locality", "sublocality", "postal_town",
  "administrative_area_level_1", "administrative_area_level_2", "administrative_area_level_3",
  "country", "political",
]);
const isPlaceLevelResult = (result) => (result?.types || []).some((t) => PLACE_LEVEL_TYPES.has(t));

// Athens, GA center — used as the "you are here" fallback until a user sets
// their real location.
const DEFAULT_LAT = 33.95;
const DEFAULT_LNG = -83.37;
const MILES_TO_METERS = 1609.34;

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// setOptions() must only be called once per page load — CourtsMap unmounts
// and remounts every time you switch tabs, so this needs to survive that.
// A module-level flag isn't enough in dev: Vite HMR re-executes this module
// (resetting any `let`) whenever the file changes, so the flag lives on
// `window` instead, which HMR doesn't touch.
const MAPS_OPTIONS_SET_KEY = "__rallyMapsOptionsSet";

// Muted, low-clutter style closer to the app's court-paper palette than
// Google's default look — hides POI/transit noise so court pins stand out.
const MAP_STYLE = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#E8F0E5" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe0e8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

const pinIcon = (fill, label) => ({
  url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="18" cy="18" r="15" fill="${fill}" stroke="#fff" stroke-width="2.5" />
    </svg>
  `),
  scaledSize: { width: 36, height: 36 },
  anchor: { x: 18, y: 18 },
  labelOrigin: { x: 18, y: 18 },
});

export default function CourtsMap({ me, update }) {
  const { data: players, isLoading: playersLoading, error: playersError } = useAllProfiles();
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map()); // court id -> marker instance
  const MarkerRef = useRef(null);
  const meMarkerRef = useRef(null);
  const circlesRef = useRef([]);
  const [mapsError, setMapsError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [selected, setSelected] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [cityInput, setCityInput] = useState("");
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState(null);
  const geocoderRef = useRef(null);

  const userLat = me.lat ?? DEFAULT_LAT;
  const userLng = me.lng ?? DEFAULT_LNG;

  // Real courts near wherever the user's pin is (Google Places) — only
  // fires once a real location is set, since the curated Athens seed list
  // already covers the unset-default case. Results are filtered by the
  // current radius client-side below, same as the seed list, so dragging
  // the radius slider doesn't re-fire the API call.
  const { data: nearbyData, isLoading: nearbyLoading, error: nearbyError } =
    useNearbyCourts(me.lat, me.lng);

  // Courts are a fixed Athens, GA list — the radius slider actually hides/
  // shows them by real distance from the user's pin, instead of every
  // court always appearing regardless of location or radius.
  const visibleCourts = COURT_LOCS.filter(
    (c) => distanceMiles(userLat, userLng, c.lat, c.lng) <= me.radius_mi
  );
  // Places often knows about the same seeded Athens courts too (they're
  // real public parks) — drop anything within ~0.15mi of a seed court so
  // it doesn't show up twice.
  const visibleDynamicCourts = (nearbyData?.courts || [])
    .filter((dc) => !COURT_LOCS.some((sc) => distanceMiles(dc.lat, dc.lng, sc.lat, sc.lng) < 0.15))
    .filter((c) => distanceMiles(userLat, userLng, c.lat, c.lng) <= me.radius_mi);
  const allCourts = [...visibleCourts, ...visibleDynamicCourts];

  const selCourt = allCourts.find((c) => c.id === selected);
  const list = players || [];
  // "Near this court" is distance from each player's own location, not a
  // home_court name match — home_court is a fixed dropdown of the 6 seed
  // Athens courts (Profile.jsx), so it can never match a court that only
  // exists because a city search just pulled it in from Places. This
  // way "who's here" works for any court, anywhere, the same way the map
  // itself now does.
  const playersHere = selCourt
    ? list.filter((p) => p.lat !== null && p.lng !== null && distanceMiles(p.lat, p.lng, selCourt.lat, selCourt.lng) <= NEARBY_PLAYER_RADIUS_MI)
    : [];
  const selCourtDistance = selCourt ? distanceMiles(userLat, userLng, selCourt.lat, selCourt.lng) : null;

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Your browser doesn't support location.");
      return;
    }
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update({ fields: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(err.message || "Couldn't get your location.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const searchCity = async () => {
    const query = cityInput.trim();
    if (!query || !MAPS_API_KEY) return;
    setCityError(null);
    setCityLoading(true);
    try {
      if (!geocoderRef.current) {
        const { Geocoder } = await importLibrary("geocoding");
        geocoderRef.current = new Geocoder();
      }
      const { results } = await geocoderRef.current.geocode({ address: query });
      const top = results[0];
      if (!top) throw new Error("No matching place found — try a different search.");
      if (!isPlaceLevelResult(top)) {
        throw new Error('That doesn\'t look like a city — try just the city name, or "City, State".');
      }
      const loc = top.geometry.location;
      update({ fields: { lat: loc.lat(), lng: loc.lng() } });
    } catch (err) {
      setCityError(err.message || "Couldn't find that place. Try a different search.");
    } finally {
      setCityLoading(false);
    }
  };

  // Load the Google Map once
  useEffect(() => {
    if (!MAPS_API_KEY || !mapDivRef.current) return;
    let cancelled = false;
    if (!window[MAPS_OPTIONS_SET_KEY]) {
      setOptions({ key: MAPS_API_KEY, v: "weekly" });
      window[MAPS_OPTIONS_SET_KEY] = true;
    }
    Promise.all([importLibrary("maps"), importLibrary("marker")])
      .then(([{ Map, Circle }, { Marker }]) => {
        if (cancelled || !mapDivRef.current) return;
        MarkerRef.current = Marker;
        mapRef.current = new Map(mapDivRef.current, {
          center: { lat: userLat, lng: userLng },
          zoom: 12,
          styles: MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
        });
        meMarkerRef.current = new Marker({
          map: mapRef.current,
          position: { lat: userLat, lng: userLng },
          icon: pinIcon("#C9F03C", "ME"),
          label: { text: "ME", color: "#15322A", fontSize: "9px", fontWeight: "800" },
          zIndex: 10,
        });
        circlesRef.current = [5, 10].map((mi) => new Circle({
          map: mapRef.current,
          center: { lat: userLat, lng: userLng },
          radius: mi * MILES_TO_METERS,
          fillOpacity: 0,
          strokeColor: "#15322A",
          strokeOpacity: 0.25,
          strokeWeight: 1,
        }));
        setMapReady(true);
      })
      .catch((err) => !cancelled && setMapsError(err));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center the map and move the "ME" marker/rings when location changes
  // (e.g. after clicking "Use my location") — the map itself is only ever
  // created once above.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.setCenter({ lat: userLat, lng: userLng });
    meMarkerRef.current?.setPosition({ lat: userLat, lng: userLng });
    circlesRef.current.forEach((c) => c.setCenter({ lat: userLat, lng: userLng }));
  }, [mapReady, userLat, userLng]);

  // Create/remove court markers as the visible set changes (radius, location,
  // or the async nearby-courts fetch resolving), then just update icon/label
  // in place for markers that stick around — avoids tearing down and
  // rebuilding every marker (and re-encoding every icon) on every single
  // pin tap or player-count change.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !MarkerRef.current) return;
    const Marker = MarkerRef.current;
    const visibleIds = new Set(allCourts.map((c) => c.id));

    for (const [id, marker] of markersRef.current) {
      if (!visibleIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    }

    for (const c of allCourts) {
      if (!markersRef.current.has(c.id)) {
        const marker = new Marker({
          map: mapRef.current,
          position: { lat: c.lat, lng: c.lng },
          title: c.name,
        });
        marker.addListener("click", () => setSelected((prev) => (prev === c.id ? null : c.id)));
        markersRef.current.set(c.id, marker);
      }
    }

    for (const c of allCourts) {
      // Distance-based, not a home_court name match — see the playersHere
      // comment above for why. allCourts tops out around two dozen and
      // `list` is every profile, so this stays cheap at this app's scale.
      const pCount = list.filter(
        (p) => p.lat !== null && p.lng !== null && distanceMiles(p.lat, p.lng, c.lat, c.lng) <= NEARBY_PLAYER_RADIUS_MI
      ).length;
      // c.courts (a known court count) only ever exists on the seed data —
      // Places doesn't report it, so fall back to a plain dot rather than
      // stringify null/undefined into a literal "null" label.
      const label = pCount || c.courts || "•";
      const isSelected = selected === c.id;
      const marker = markersRef.current.get(c.id);
      marker.setIcon(pinIcon(isSelected ? "#C75D3A" : "#15322A", String(label)));
      marker.setLabel({ text: String(label), color: isSelected ? "#fff" : "#C9F03C", fontSize: "11px", fontWeight: "800" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, list, selected, userLat, userLng, me.radius_mi, nearbyData]);

  return (
    <div>
      <Header eyebrow="Court finder" title="Courts near you" sub="Athens, GA · tap a pin for details" />

      <div className="card card-section">
        <div className="text-label mb-10">Your location
        </div>
        <div className="items-center gap-10 flex-wrap">
          <button className="btn btn-o" disabled={geoLoading} onClick={useMyLocation}>
            <LocateFixed size={14} />{geoLoading ? "Locating…" : "Use my location"}
          </button>
          <span className="text-muted text-12">
            {me.lat !== null ? `Set (${me.lat.toFixed(2)}, ${me.lng.toFixed(2)})` : "Not set — matching needs this"}
          </span>
        </div>
        <ErrorNote error={geoError ? { message: geoError } : null} />

        <div className="items-center gap-10 mt-10">
          <input className="inp flex-1" placeholder="Or search a city — anywhere in the world"
            value={cityInput} disabled={!MAPS_API_KEY}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") searchCity(); }} />
          <button className="btn btn-ghost btn-icon border-ink" disabled={cityLoading || !cityInput.trim() || !MAPS_API_KEY}
            title="Search" onClick={searchCity}>
            {cityLoading ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
          </button>
        </div>
        <ErrorNote error={cityError ? { message: cityError } : null} />
      </div>

      <Field label={`Search radius — ${me.radius_mi} mi`}>
        <div className="flex-center-gap">
          <button className="btn btn-ghost btn-icon border-ink"
            disabled={me.radius_mi <= RADIUS_MIN}
            onClick={() => update({ fields: { radius_mi: Math.max(RADIUS_MIN, me.radius_mi - 1) } })}>
            <Minus size={14} />
          </button>
          <input type="range" min={RADIUS_MIN} max={RADIUS_MAX} step="1" value={me.radius_mi}
            onChange={(e) => update({ fields: { radius_mi: Number(e.target.value) } })}
            className="flex-1 accent-clay" />
          <button className="btn btn-ghost btn-icon border-ink"
            disabled={me.radius_mi >= RADIUS_MAX}
            onClick={() => update({ fields: { radius_mi: Math.min(RADIUS_MAX, me.radius_mi + 1) } })}>
            <Plus size={14} />
          </button>
        </div>
      </Field>

      <ErrorNote error={playersError} label="Couldn't load players. Try again in a moment." />

      {!MAPS_API_KEY ? (
        <ErrorNote error={{ message: "not configured" }}
          label="Google Maps isn't configured yet — add VITE_GOOGLE_MAPS_API_KEY to .env." />
      ) : null}
      <ErrorNote error={mapsError} label="Couldn't load Google Maps — check the API key and that billing is enabled." />

      {MAPS_API_KEY ? (
        <div className="card p-0 overflow-hidden mb-14 relative">
          {!mapReady && !mapsError ? <Loading label="Loading map…" /> : null}
          <div ref={mapDivRef} className={`w-full h-340 ${mapReady ? "block" : "hidden"}`} />
          <div className={`flex-start map-legend gap-16 text-11 fw-700 ${mapReady ? "border-top-ink" : ""}`}>
            <span className="flex-center-gap">
              <span className="legend-dot-ink" />
              # Courts / players
            </span>
            <span className="flex-center-gap">
              <span className="legend-dot-optic" />
              You
            </span>
          </div>
        </div>
      ) : null}

      {playersLoading ? <Loading label="Loading players…" /> : null}
      {nearbyLoading ? <Loading label="Searching for courts near you…" /> : null}
      <ErrorNote error={nearbyError} label="Couldn't load nearby courts from Google — showing the seed list only." />

      {selCourt ? (
        <div className="card pop p-18">
          <div className="flex-between mb-12">
            <div>
              <div className="disp text-21 fw-800">{selCourt.name}</div>
              <div className="text-muted text-13 mt-3 flex gap-10 flex-wrap">
                {selCourt.courts ? <span>{selCourt.courts} courts</span> : null}
                {selCourt.surfaces ? <span>{selCourt.surfaces.join(" & ")}</span> : null}
                <span>{selCourtDistance.toFixed(1)} mi away</span>
                {selCourt.lit ? <span className="text-optic-d">Lit</span> : null}
                {selCourt.rating ? <span>★ {selCourt.rating}</span> : null}
              </div>
              {selCourt.address ? <div className="text-muted text-12 mt-3">{selCourt.address}</div> : null}
            </div>
            <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}><X size={16} /></button>
          </div>
          {selCourt.desc ? <p className="court-desc">{selCourt.desc}</p> : null}
          {selCourt.source === "places" ? (
            <div className="text-muted text-11 mt-3 mb-8">
              Via Google — details may be incomplete.
            </div>
          ) : null}
          {playersHere.length > 0 ? (
            <div>
              <div className="text-label mb-8">Players here</div>
              <div className="flex-col gap-9">
                {playersHere.map((p) => (
                  <div key={p.id} className="flex-center-gap">
                    <Avatar name={p.name} size={32} />
                    <span className="fw-700 text-14">{p.name}</span>
                    <span className="tag tag-optic ml-auto">{p.ntrp}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : !nearbyLoading && allCourts.length === 0 ? (
        <div className="card p-16 bg-paper2">
          <div className="text-muted text-center text-13">
            No courts within {me.radius_mi} mi of your location. Try widening your search radius or setting a different location above.
          </div>
        </div>
      ) : (
        <div className="card p-16 bg-paper2">
          <div className="text-muted text-center text-13">Tap a court pin to see details and nearby players.</div>
        </div>
      )}
    </div>
  );
}
