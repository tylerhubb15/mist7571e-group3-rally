import React, { useState } from "react";
import {
  Search, Calendar as CalIcon, MessageCircle, UserCircle, MapPin, Activity, Map as MapIcon,
} from "lucide-react";
import { ME, SEED_SESSIONS } from "./data/mockData.js";
import Discover from "./components/Discover.jsx";
import CourtsMap from "./components/CourtsMap.jsx";
import Messages from "./components/Messages.jsx";
import CalendarView from "./components/CalendarView.jsx";
import Profile from "./components/Profile.jsx";
import ProposeModal from "./components/ProposeModal.jsx";

export default function App() {
  const [tab, setTab] = useState("discover");
  const [me, setMe] = useState(ME);
  const [modal, setModal] = useState(null);
  const [sessions, setSessions] = useState(SEED_SESSIONS);

  const propose = ({ player, slot, court }) => {
    setSessions((s) => [...s, { id: Date.now(), player, slot, court, status: "pending" }]);
    setModal(null);
    setTab("calendar");
  };

  const pendingCount = sessions.filter((s) => s.status === "incoming").length;

  const NAV = [
    { k: "discover", label: "Discover", Icon: Search },
    { k: "courts",   label: "Courts",   Icon: MapIcon },
    { k: "messages", label: "Messages", Icon: MessageCircle },
    { k: "calendar", label: "Calendar", Icon: CalIcon, badge: pendingCount },
    { k: "profile",  label: "Profile",  Icon: UserCircle },
  ];

  return (
    <div className="rally court-bg">
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--ink)",
        borderBottom: "2px solid var(--ink)", padding: "11px 18px",
        display: "flex", alignItems: "center", gap: 9 }}>
        <div className="ring" style={{ width: 28, height: 28, background: "var(--optic)" }}>
          <Activity size={15} color="var(--ink)" />
        </div>
        <span className="disp" style={{ color: "var(--paper)", fontSize: 21, fontWeight: 800 }}>RALLY</span>
        <span style={{ color: "var(--optic)", fontSize: 11, fontWeight: 700, marginTop: 5 }}>find your hit</span>
        <span style={{ marginLeft: "auto", color: "var(--paper)", fontSize: 11, fontWeight: 600, opacity: 0.65,
          display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} />Athens, GA</span>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "22px 16px 110px" }}>
        {tab === "discover" ? <Discover me={me} onPropose={(p) => setModal(p)} /> : null}
        {tab === "courts"   ? <CourtsMap /> : null}
        {tab === "messages" ? <Messages /> : null}
        {tab === "calendar" ? <CalendarView sessions={sessions} setSessions={setSessions} /> : null}
        {tab === "profile"  ? <Profile me={me} setMe={setMe} /> : null}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", zIndex: 30,
        background: "var(--paper)", borderTop: "2px solid var(--ink)",
        padding: "6px 6px 10px", display: "flex", maxWidth: 520, width: "100%" }}>
        {NAV.map(({ k, label, Icon, badge }) => (
          <button key={k} className={`navbtn ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
            <div className="nicon" style={{ position: "relative" }}>
              <Icon size={17} />
              {badge > 0 ? (
                <span style={{ position: "absolute", top: -2, right: 3, background: "var(--clay)",
                  color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 99, minWidth: 14, height: 14,
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px" }}>{badge}</span>
              ) : null}
            </div>
            {label}
          </button>
        ))}
      </div>

      {modal ? <ProposeModal player={modal} me={me} onClose={() => setModal(null)} onConfirm={propose} /> : null}
    </div>
  );
}
