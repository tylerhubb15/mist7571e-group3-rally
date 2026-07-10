// Static reference lists shared across screens. Player/session data now
// comes from Supabase — see src/lib/services.js and src/hooks/hooks.jsx.

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const PERIODS = ["AM", "PM", "EVE"];
export const INTENTS = ["Casual rally", "Drilling", "Competitive sets", "Match practice"];
export const FORMATS = ["Singles", "Doubles"];
export const HANDS = ["Right", "Left", "Ambidextrous"];
export const COURTS = [
  "Dan Magill Complex", "Bishop Park", "SE Clarke Park", "Holland Park", "Memorial Park",
];

export const COURT_LOCS = [
  { id: "c1", name: "Dan Magill Complex",  lat: 33.9452, lng: -83.3702, surfaces: ["Hard"],         courts: 12, lit: true,  desc: "Premier UGA facility. Hard courts, floodlit." },
  { id: "c2", name: "Bishop Park",         lat: 33.9587, lng: -83.3770, surfaces: ["Hard"],         courts: 8,  lit: true,  desc: "City park courts. Popular evening spot." },
  { id: "c3", name: "SE Clarke Park",      lat: 33.9253, lng: -83.3430, surfaces: ["Hard", "Clay"], courts: 6,  lit: false, desc: "Mix of hard & clay. Quieter on weekdays." },
  { id: "c4", name: "Holland Park",        lat: 33.9714, lng: -83.4010, surfaces: ["Hard"],         courts: 4,  lit: false, desc: "Neighborhood courts. Good morning sessions." },
  { id: "c5", name: "Memorial Park",       lat: 33.9832, lng: -83.3810, surfaces: ["Hard"],         courts: 6,  lit: true,  desc: "North Athens favorite. Fast hard courts." },
  { id: "c6", name: "Oconee Hills Courts", lat: 33.9120, lng: -83.3880, surfaces: ["Clay"],         courts: 4,  lit: false, desc: "Clay-only. Nice change of pace." },
];
