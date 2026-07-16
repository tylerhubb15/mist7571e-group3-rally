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
      <div className="rally court-bg">
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
      <div className="rally court-bg">
        <Loading label="Setting up your profile…" />
      </div>
    );
  }
  if (profileError || !profile) {
    return (
      <div className="rally court-bg flex-center p-24">
        <div className="card p-24 max-w-380">
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
            className="btn btn-o btn-full"
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
      <div className="app-header items-center gap-9">
        <div className="ring app-logo-ring">
          <Activity size={15} color="var(--ink)" />
        </div>
        <span className="disp app-brand">
          RALLY
        </span>
        <span className="app-tagline">
          find your hit
        </span>
        <span className="items-center gap-4 app-location">
          <MapPin size={12} />
          Athens, GA
        </span>
        <button
          className="btn btn-ghost p-6 text-paper"
          title="Sign out"
          onClick={signOut}
        >
          <LogOut size={15} />
        </button>
      </div>

      <div className="app-main">
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

      <div className="app-bottom-nav">
        {NAV.map(({ k, label, Icon, badge }) => (
          <button
            key={k}
            className={`navbtn ${tab === k ? "on" : ""}`}
            onClick={() => setTab(k)}
          >
            <div className="nicon relative">
              <Icon size={17} />
              {badge > 0 ? (
                <span className="flex-center nav-badge">
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
