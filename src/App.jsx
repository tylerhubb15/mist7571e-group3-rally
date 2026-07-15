import React, { useState } from "react";
import {
  Search,
  Calendar as CalIcon,
  MessageCircle,
  UserCircle,
  MapPin,
  Activity,
  Map as MapIcon,
  LogOut,
  Sparkles,
} from "lucide-react";
import {
  useAuth,
  useProfile,
  useSessions,
  useMatchResults,
} from "./hooks/hooks.jsx";
import Auth from "./components/Auth.jsx";
import Discover from "./components/Discover.jsx";
import CourtsMap from "./components/CourtsMap.jsx";
import Messages from "./components/Messages.jsx";
import CalendarView from "./components/CalendarView.jsx";
import Profile from "./components/Profile.jsx";
import ProposeModal from "./components/ProposeModal.jsx";
import MatchHistoryModal from "./components/MatchHistoryModal.jsx";
import AICoach from "./components/AICoach.jsx";
import { Loading, ErrorNote } from "./components/Shared.jsx";

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();

  if (authLoading) {
    return (
      <div className="rally court-bg" style={{ minHeight: "100vh" }}>
        <Loading label="Loading Rally…" />
      </div>
    );
  }
  if (!user) {
    return <Auth />;
  }
  return <AuthedApp user={user} signOut={signOut} />;
}

function AuthedApp({ user, signOut }) {
  const profileQuery = useProfile(user.id);
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch,
    update,
    updateAsync,
    updating,
    updateError,
  } = profileQuery;
  const sessionsHook = useSessions(user.id);
  const matchResultsHook = useMatchResults(user.id);

  const [tab, setTab] = useState("discover");
  const [modal, setModal] = useState(null);
  const [proposeError, setProposeError] = useState(null);
  const [activeThread, setActiveThread] = useState(null); // { id, name, ntrp } | null
  const [matchModal, setMatchModal] = useState(null); // { session } | { match } | {} (new manual) | null
  const [matchError, setMatchError] = useState(null);

  const openThread = (partner) => {
    setActiveThread(partner);
    setTab("messages");
  };

  if (profileLoading) {
    return (
      <div className="rally court-bg" style={{ minHeight: "100vh" }}>
        <Loading label="Setting up your profile…" />
      </div>
    );
  }
  if (profileError || !profile) {
    return (
      <div
        className="rally court-bg"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div className="card" style={{ padding: 24, maxWidth: 380 }}>
          <ErrorNote
            error={
              profileError || {
                message: "No profile row found for this account.",
              }
            }
            label={
              profileError
                ? `Couldn't load your profile: ${profileError.message}`
                : undefined
            }
          />
          <button
            className="btn btn-o"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => refetch()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const doPropose = async (payload) => {
    setProposeError(null);
    try {
      await sessionsHook.proposeAsync(payload);
      setModal(null);
      setTab("calendar");
    } catch (err) {
      setProposeError(err);
    }
  };

  const doSaveMatch = async (payload) => {
    setMatchError(null);
    try {
      if (payload.id) {
        await matchResultsHook.updateAsync(payload);
      } else if (payload.sessionId) {
        await matchResultsHook.reportAsync({ reportedBy: user.id, ...payload });
      } else {
        await matchResultsHook.logManualAsync({
          reportedBy: user.id,
          ...payload,
        });
      }
      setMatchModal(null);
    } catch (err) {
      setMatchError(err);
    }
  };

  const pendingCount = (sessionsHook.data || []).filter(
    (s) => s.uiStatus === "incoming",
  ).length;

  const NAV = [
    { k: "discover", label: "Discover", Icon: Search },
    { k: "courts", label: "Courts", Icon: MapIcon },
    { k: "messages", label: "Messages", Icon: MessageCircle },
    { k: "calendar", label: "Calendar", Icon: CalIcon, badge: pendingCount },
    { k: "ai", label: "AI Coach", Icon: Sparkles },
    { k: "profile", label: "Profile", Icon: UserCircle },
  ];

  return (
    <div className="rally court-bg">
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--ink)",
          borderBottom: "2px solid var(--ink)",
          padding: "11px 18px",
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <div
          className="ring"
          style={{ width: 28, height: 28, background: "var(--optic)" }}
        >
          <Activity size={15} color="var(--ink)" />
        </div>
        <span
          className="disp"
          style={{ color: "var(--paper)", fontSize: 21, fontWeight: 800 }}
        >
          RALLY
        </span>
        <span
          style={{
            color: "var(--optic)",
            fontSize: 11,
            fontWeight: 700,
            marginTop: 5,
          }}
        >
          find your hit
        </span>
        <span
          style={{
            marginLeft: "auto",
            color: "var(--paper)",
            fontSize: 11,
            fontWeight: 600,
            opacity: 0.65,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <MapPin size={12} />
          Athens, GA
        </span>
        <button
          className="btn btn-ghost"
          style={{ padding: 6, color: "var(--paper)" }}
          title="Sign out"
          onClick={signOut}
        >
          <LogOut size={15} />
        </button>
      </div>

      <div
        style={{ maxWidth: 520, margin: "0 auto", padding: "22px 16px 110px" }}
      >
        {tab === "discover" ? (
          <Discover
            me={profile}
            onPropose={(p) => setModal(p)}
            onMessage={openThread}
          />
        ) : null}
        {tab === "courts" ? <CourtsMap me={profile} update={update} /> : null}
        {tab === "messages" ? (
          <Messages
            myId={user.id}
            active={activeThread}
            onOpenThread={setActiveThread}
            onCloseThread={() => setActiveThread(null)}
          />
        ) : null}
        {tab === "calendar" ? (
          <CalendarView
            sessions={sessionsHook.data}
            isLoading={sessionsHook.isLoading}
            error={sessionsHook.error}
            setStatus={sessionsHook.setStatus}
            setStatusError={sessionsHook.setStatusError}
            onMessage={openThread}
            myId={user.id}
            results={matchResultsHook.data}
            onLogResult={(s) => setMatchModal({ session: s })}
          />
        ) : null}
        {tab === "ai" ? <AICoach me={profile} /> : null}
        {tab === "profile" ? (
          <Profile
            me={profile}
            update={update}
            updateAsync={updateAsync}
            updating={updating}
            updateError={updateError}
            matchResults={matchResultsHook.data}
            onAddMatch={() => setMatchModal({})}
            onEditMatch={(m) => setMatchModal({ match: m })}
          />
        ) : null}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 30,
          background: "var(--paper)",
          borderTop: "2px solid var(--ink)",
          padding: "6px 6px 10px",
          display: "flex",
          maxWidth: 520,
          width: "100%",
        }}
      >
        {NAV.map(({ k, label, Icon, badge }) => (
          <button
            key={k}
            className={`navbtn ${tab === k ? "on" : ""}`}
            onClick={() => setTab(k)}
          >
            <div className="nicon" style={{ position: "relative" }}>
              <Icon size={17} />
              {badge > 0 ? (
                <span
                  style={{
                    position: "absolute",
                    top: -2,
                    right: 3,
                    background: "var(--clay)",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 800,
                    borderRadius: 99,
                    minWidth: 14,
                    height: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 2px",
                  }}
                >
                  {badge}
                </span>
              ) : null}
            </div>
            {label}
          </button>
        ))}
      </div>

      {modal ? (
        <ProposeModal
          player={modal}
          me={profile}
          onClose={() => {
            setModal(null);
            setProposeError(null);
          }}
          onConfirm={doPropose}
          sending={sessionsHook.proposing}
          error={proposeError}
          onGoToProfile={() => {
            setModal(null);
            setTab("profile");
          }}
        />
      ) : null}

      {matchModal ? (
        <MatchHistoryModal
          me={profile}
          session={matchModal.session}
          match={matchModal.match}
          onClose={() => {
            setMatchModal(null);
            setMatchError(null);
          }}
          onConfirm={doSaveMatch}
          sending={
            matchResultsHook.reporting ||
            matchResultsHook.loggingManual ||
            matchResultsHook.updating
          }
          error={matchError}
        />
      ) : null}
    </div>
  );
}
