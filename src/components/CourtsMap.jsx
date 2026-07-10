import React, { useEffect, useRef, useState } from "react";
import { X, LocateFixed } from "lucide-react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { COURT_LOCS } from "../data/mockData.js";
import { useAllProfiles } from "../hooks/hooks.jsx";
import { Avatar, Header, Loading, ErrorNote, Field } from "./Shared.jsx";

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

      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>
          Your location
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-o" disabled={geoLoading} onClick={useMyLocation}>
            <LocateFixed size={14} />{geoLoading ? "Locating…" : "Use my location"}
          </button>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
            {me.lat != null ? `Set (${me.lat.toFixed(2)}, ${me.lng.toFixed(2)})` : "Not set — matching needs this"}
          </span>
        </div>
        <ErrorNote error={geoError ? { message: geoError } : null} />
      </div>

      <Field label={`Search radius — ${me.radius_mi} mi`}>
        <input type="range" min="3" max="25" step="1" value={me.radius_mi}
          onChange={(e) => update({ fields: { radius_mi: Number(e.target.value) } })}
          style={{ width: "100%", accentColor: "var(--clay)" }} />
      </Field>

      <ErrorNote error={playersError} label="Couldn't load players. Try again in a moment." />

      {!MAPS_API_KEY ? (
        <ErrorNote error={{ message: "not configured" }}
          label="Google Maps isn't configured yet — add VITE_GOOGLE_MAPS_API_KEY to .env." />
      ) : null}
      <ErrorNote error={mapsError} label="Couldn't load Google Maps — check the API key and that billing is enabled." />

      {MAPS_API_KEY ? (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14, position: "relative" }}>
          {!mapReady && !mapsError ? <Loading label="Loading map…" /> : null}
          <div ref={mapDivRef} style={{ width: "100%", height: 340, display: mapReady ? "block" : "none" }} />
          <div style={{ padding: "10px 14px", borderTop: mapReady ? "1.5px solid var(--ink)" : "none", background: "#fff",
            display: "flex", gap: 16, fontSize: 11, fontWeight: 700 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 12, height: 12, borderRadius: 99, background: "var(--ink)", display: "inline-block" }} />
              # Courts / players
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 12, height: 12, borderRadius: 99, background: "var(--optic)", border: "1.5px solid var(--ink)", display: "inline-block" }} />
              You
            </span>
          </div>
        </div>
      ) : null}

      {playersLoading ? <Loading label="Loading players…" /> : null}

      {selCourt ? (
        <div className="card pop" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div className="disp" style={{ fontSize: 21, fontWeight: 800 }}>{selCourt.name}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginTop: 3, display: "flex", gap: 10 }}>
                <span>{selCourt.courts} courts</span>
                <span>{selCourt.surfaces.join(" & ")}</span>
                {selCourt.lit ? <span style={{ color: "var(--optic-d)" }}>Lit</span> : null}
              </div>
            </div>
            <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setSelected(null)}><X size={16} /></button>
          </div>
          <p style={{ fontSize: 14, margin: "0 0 13px", fontWeight: 500 }}>{selCourt.desc}</p>
          {playersHere.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>Players here</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {playersHere.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={p.name} size={32} />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                    <span className="tag" style={{ background: "var(--optic)", marginLeft: "auto" }}>{p.ntrp}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="card" style={{ padding: 16, textAlign: "center", background: "var(--paper2)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>Tap a court pin to see details and nearby players.</div>
        </div>
      )}
    </div>
  );
}
