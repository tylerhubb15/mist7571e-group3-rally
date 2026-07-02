// Mock data used during Phase 1 (pre-backend).
// Replace with Supabase queries in Phase 2 — see src/lib/services.js

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const PERIODS = ["AM", "PM", "EVE"];
export const INTENTS = ["Casual rally", "Drilling", "Competitive sets", "Match practice"];
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

export const ME = {
  id: 0, name: "You", ntrp: 4.0, lat: 33.95, lng: -83.37, radius: 12,
  intent: "Match practice", surfaces: ["Hard"], hand: "Right",
  racket: "Wilson Blade 100 v10", home: "Dan Magill Complex",
  slots: ["Mon-EVE", "Wed-EVE", "Sat-AM", "Sat-PM", "Sun-AM"],
  bio: "Heavy topspin baseliner. Looking for consistent match reps.",
};

export const PLAYERS = [
  { id: 1, name: "Marcus Bell",  ntrp: 4.0, dist: 3.1,  intent: "Match practice",   surfaces: ["Hard"],         hand: "Right", racket: "Babolat Pure Aero",  home: "Bishop Park",       slots: ["Mon-EVE", "Wed-EVE", "Sat-AM"] },
  { id: 2, name: "Priya Nair",   ntrp: 4.5, dist: 5.4,  intent: "Competitive sets", surfaces: ["Hard", "Clay"], hand: "Right", racket: "Yonex VCORE 98",     home: "Dan Magill Complex", slots: ["Sat-AM", "Sat-PM", "Sun-AM"] },
  { id: 3, name: "Tomás Reyes",  ntrp: 3.5, dist: 2.0,  intent: "Drilling",         surfaces: ["Hard"],         hand: "Left",  racket: "Head Speed MP",      home: "Dan Magill Complex", slots: ["Wed-EVE", "Fri-PM", "Sun-AM"] },
  { id: 4, name: "Jordan Ames",  ntrp: 4.0, dist: 8.7,  intent: "Match practice",   surfaces: ["Hard", "Clay"], hand: "Right", racket: "Wilson Ultra 100",   home: "SE Clarke Park",     slots: ["Sat-PM", "Sun-AM", "Sun-PM"] },
  { id: 5, name: "Lena Fox",     ntrp: 3.5, dist: 11.2, intent: "Casual rally",     surfaces: ["Hard"],         hand: "Right", racket: "Prince Textreme",    home: "Memorial Park",      slots: ["Tue-AM", "Thu-AM", "Sat-AM"] },
  { id: 6, name: "Dev Okafor",   ntrp: 4.5, dist: 4.3,  intent: "Match practice",   surfaces: ["Hard"],         hand: "Right", racket: "Wilson Blade 98",    home: "Bishop Park",        slots: ["Mon-EVE", "Sat-AM", "Sat-PM"] },
  { id: 7, name: "Sofia Marino", ntrp: 4.0, dist: 6.8,  intent: "Competitive sets", surfaces: ["Hard", "Clay"], hand: "Right", racket: "Babolat Pure Drive", home: "Holland Park",       slots: ["Sun-AM", "Sun-PM", "Wed-EVE"] },
];

export const SEED_MESSAGES = {
  6: [
    { from: "them", text: "Hey! I saw you're a 4.0 at Dan Magill. Down for some sets this Saturday AM?", ts: "Yesterday 7:14 PM" },
    { from: "them", text: "Just sent a session request through the calendar. LMK if the time works!", ts: "Yesterday 7:16 PM" },
  ],
  1: [
    { from: "them", text: "Yo — great match record. Want to do a Wed evening sesh at Bishop? I'll bring the balls.", ts: "Mon 6:30 PM" },
    { from: "me",   text: "For sure, let me confirm the time and I'll book it.", ts: "Mon 6:45 PM" },
    { from: "them", text: "Perfect. Sent the calendar invite. Looking forward to it.", ts: "Mon 6:51 PM" },
  ],
};

export const SEED_SESSIONS = [
  { id: 101, player: PLAYERS[5], slot: "Sat-AM", court: "Bishop Park",        status: "incoming" },
  { id: 102, player: PLAYERS[1], slot: "Sun-AM", court: "Dan Magill Complex", status: "incoming" },
];
