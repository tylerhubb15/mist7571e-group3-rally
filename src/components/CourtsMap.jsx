import React, { useEffect, useRef, useState } from "react";
import { X, LocateFixed, Minus, Plus } from "lucide-react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { COURT_LOCS } from "../data/mockData.js";
import { useAllProfiles } from "../hooks/hooks.jsx";
import { Avatar, Header, Loading, ErrorNote, Field } from "./Shared.jsx";
import { distanceMiles } from "../lib/geo.js";

const RADIUS_MIN = 3;
const RADIUS_MAX = 25;

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
  const markersRef = useRef([]);
  const MarkerRef = useRef(null);
  const meMarkerRef = useRef(null);
  const circlesRef = useRef([]);
  const [mapsError, setMapsError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [selected, setSelected] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  const selCourt = COURT_LOCS.find((c) => c.id === selected);
  const list = players || [];
  const playersHere = selCourt ? list.filter((p) => p.home_court === selCourt.name) : [];
  const userLat = me.lat ?? DEFAULT_LAT;
  const userLng = me.lng ?? DEFAULT_LNG;
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

  // (Re)draw court markers once the map is ready and/or player counts change
  useEffect(() => {
    if (!mapReady || !mapRef.current || !MarkerRef.current) return;
    const Marker = MarkerRef.current;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = COURT_LOCS.map((c) => {
      const pCount = list.filter((p) => p.home_court === c.name).length;
      const isSelected = selected === c.id;
      const marker = new Marker({
        map: mapRef.current,
        position: { lat: c.lat, lng: c.lng },
        icon: pinIcon(isSelected ? "#C75D3A" : "#15322A", String(pCount || c.courts)),
        label: { text: String(pCount || c.courts), color: isSelected ? "#fff" : "#C9F03C", fontSize: "11px", fontWeight: "800" },
        title: c.name,
      });
      marker.addListener("click", () => setSelected(isSelected ? null : c.id));
      return marker;
    });
  }, [mapReady, list, selected]);

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

      {selCourt ? (
        <div className="card pop p-18">
          <div className="flex-between mb-12">
            <div>
              <div className="disp text-21 fw-800">{selCourt.name}</div>
              <div className="text-muted text-13 mt-3 flex gap-10">
                <span>{selCourt.courts} courts</span>
                <span>{selCourt.surfaces.join(" & ")}</span>
                <span>{selCourtDistance.toFixed(1)} mi away</span>
                {selCourt.lit ? <span className="text-optic-d">Lit</span> : null}
              </div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}><X size={16} /></button>
          </div>
          <p className="court-desc">{selCourt.desc}</p>
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
      ) : (
        <div className="card p-16 bg-paper2">
          <div className="text-muted text-center text-13">Tap a court pin to see details and nearby players.</div>
        </div>
      )}
    </div>
  );
}
