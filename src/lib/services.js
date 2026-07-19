// ═══════════════════════════════════════════════════════════════════
//  RALLY — Supabase Service Layer
//  npm install @supabase/supabase-js
//  Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
// ═══════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A missing URL throws inside createClient() at import time, which would
// white-screen the whole app before .env is even filled in. Fall back to a
// harmless placeholder so the UI (Auth screen, "not configured" banner)
// still renders — real calls will just fail with a network error instead.
export const isSupabaseConfigured = Boolean(envUrl && envKey);

export const supabase = createClient(
  envUrl || "https://placeholder.supabase.co",
  envKey || "placeholder-anon-key"
);

// ─────────────────────────────  AUTH  ────────────────────────────

export const auth = {
  /** Social login — provider: 'google' | 'apple' */
  signInWithProvider: (provider) =>
    supabase.auth.signInWithOAuth({
      provider,
      // No router in this app — supabase-js parses the session out of the
      // URL hash on load (detectSessionInUrl defaults true), so redirecting
      // to the root is enough.
      options: { redirectTo: window.location.origin },
    }),

  signUpWithEmail: ({ email, password, firstName, lastName }) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    }),

  signInWithEmail: ({ email, password }) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  /** Subscribe to auth state changes (call in App root) */
  onAuthChange: (cb) => supabase.auth.onAuthStateChange((_event, session) => cb(session)),
};

// ──────────────────────────  PROFILES  ───────────────────────────

export const profiles = {
  /** Lightweight fetch of every profile — used for the courts map */
  listAll: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,name,ntrp,lat,lng,home_court");
    if (error) throw error;
    return data;
  },

  /** Fetch any profile by id */
  get: async (id) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, availability_slots(*)")
      .eq("id", id)
      .single();
    if (error) throw error;
    // Reshape slots to the same 'Day-Period' string format the UI expects
    data.slots = (data.availability_slots || []).map((s) => `${s.day}-${s.period}`);
    return data;
  },

  /** Update profile fields (partial update ok) */
  update: async (id, fields) => {
    const { data, error } = await supabase
      .from("profiles")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Replace all availability slots for a user */
  setSlots: async (profileId, slotStrings) => {
    // slotStrings = ['Mon-AM', 'Sat-PM', ...]
    await supabase.from("availability_slots").delete().eq("profile_id", profileId);
    if (!slotStrings.length) return;
    const rows = slotStrings.map((s) => {
      const [day, period] = s.split("-");
      return { profile_id: profileId, day, period };
    });
    const { error } = await supabase.from("availability_slots").insert(rows);
    if (error) throw error;
  },
};

// ──────────────────────────  MATCHING  ───────────────────────────

export const matching = {
  /**
   * Call the Postgres find_matches() function.
   * Returns players ranked by match_score (0–100).
   */
  findMatches: async (userId, limit = 20) => {
    const { data, error } = await supabase.rpc("find_matches", {
      p_user_id: userId,
      p_limit: limit,
    });
    if (error) throw error;
    return data; // already sorted by match_score desc
  },
};

// ──────────────────────────  SESSIONS  ───────────────────────────

export const sessions = {
  /** All sessions for the current user (any of the 4 doubles slots, or either singles side) */
  list: async (userId) => {
    const { data, error } = await supabase
      .from("sessions")
      .select(
        `*,
         proposer:profiles!sessions_proposer_id_fkey(id,name,ntrp,avatar_url),
         partner:profiles!sessions_partner_id_fkey(id,name,ntrp,avatar_url),
         proposer_partner:profiles!sessions_proposer_partner_id_fkey(id,name,ntrp,avatar_url),
         opponent_partner:profiles!sessions_opponent_partner_id_fkey(id,name,ntrp,avatar_url)`
      )
      .or(`proposer_id.eq.${userId},partner_id.eq.${userId},proposer_partner_id.eq.${userId},opponent_partner_id.eq.${userId}`)
      .order("proposed_at", { ascending: false });
    if (error) throw error;
    // Attach role/teams so the UI knows which side of the session you're
    // on — "proposer" side is (proposer, proposer_partner), "partner"
    // side is (partner, opponent_partner). Works for singles too, where
    // the *_partner slots are just null and drop out of the arrays.
    return data.map((s) => {
      const onProposingSide = s.proposer_id === userId || s.proposer_partner_id === userId;
      const proposingTeam = [s.proposer, s.proposer_partner].filter(Boolean);
      const receivingTeam = [s.partner, s.opponent_partner].filter(Boolean);
      return {
        ...s,
        role: onProposingSide ? "proposer" : "partner",
        // 'incoming' if you're on the receiving side and status is pending
        uiStatus: !onProposingSide && s.status === "pending" ? "incoming" : s.status,
        myTeam: onProposingSide ? proposingTeam : receivingTeam,
        otherTeam: onProposingSide ? receivingTeam : proposingTeam,
      };
    });
  },

  /** Propose a new session — singles (default) or doubles */
  propose: async ({ proposerId, partnerId, slotDay, slotPeriod, court, format, proposerPartnerId, opponentPartnerId }) => {
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        proposer_id: proposerId,
        partner_id: partnerId,
        slot_day: slotDay,
        slot_period: slotPeriod,
        court,
        format: format || "Singles",
        proposer_partner_id: proposerPartnerId || null,
        opponent_partner_id: opponentPartnerId || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Update status — confirm | decline | cancel */
  setStatus: async (sessionId, status) => {
    const { data, error } = await supabase
      .from("sessions")
      .update({ status })
      .eq("id", sessionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ───────────────────────  MATCH RESULTS  ─────────────────────────
// Stats only — logging a result never touches profiles.ntrp.

export const matchResults = {
  /**
   * Log the outcome of a confirmed session (singles or doubles). One
   * result per session. Pass winnerId for singles (an individual
   * profile), outcome for doubles (a team result — "did my side win").
   */
  report: async ({ sessionId, reportedBy, winnerId, outcome, set1Score, set2Score, set3Score, playedAt }) => {
    const { data, error } = await supabase
      .from("match_results")
      .insert({
        session_id: sessionId,
        reported_by: reportedBy,
        winner_id: winnerId || null,
        outcome: outcome || null,
        set1_score: set1Score || null,
        set2_score: set2Score || null,
        set3_score: set3Score || null,
        ...(playedAt ? { played_at: playedAt } : {}),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Log a past match by hand — singles or doubles, each of the "other
   * side" slots (opponent / opponent2 / your partner) independently
   * either a Rally user (…Id, visible to them too) or a typed name
   * (…Name, private to you, since there's no account to share it with).
   * winnerId only applies to singles vs. a Rally opponent (the one case
   * with exactly one identifiable profile to point at); everything else
   * — doubles, or a freeform singles opponent — uses outcome instead.
   */
  logManual: async ({
    reportedBy, format,
    opponentId, opponentName,
    partnerId, partnerName,
    opponent2Id, opponent2Name,
    winnerId, outcome,
    set1Score, set2Score, set3Score, playedAt,
  }) => {
    const { data, error } = await supabase
      .from("match_results")
      .insert({
        reported_by: reportedBy,
        format,
        opponent_id: opponentId || null,
        opponent_name: opponentName || null,
        partner_id: partnerId || null,
        partner_name: partnerName || null,
        opponent2_id: opponent2Id || null,
        opponent2_name: opponent2Name || null,
        winner_id: winnerId || null,
        outcome: outcome || null,
        set1_score: set1Score || null,
        set2_score: set2Score || null,
        set3_score: set3Score || null,
        played_at: playedAt,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Edit a result you reported — winner/score/date (+ players, if hand-logged). */
  update: async (id, fields) => {
    const { data, error } = await supabase
      .from("match_results")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Delete a result you reported. RLS also enforces this — reported_by
   *  must match the caller — so this is a no-op if you don't own it. */
  remove: async (id) => {
    const { error } = await supabase.from("match_results").delete().eq("id", id);
    if (error) throw error;
  },

  /**
   * Every result the current user has been part of — RLS already scopes
   * this. Resolves `myTeam`/`opponents` (1 player each for singles, up
   * to 2 for doubles) from `userId`'s point of view, and `viewerOutcome`
   * ('won'|'lost'|'none') the same way: winner_id is an absolute profile
   * id so it already reads correctly from either side, but `outcome` is
   * stored relative to reported_by/their team and has to be inverted
   * when the viewer is on the other side.
   */
  listForMe: async (userId) => {
    const { data, error } = await supabase
      .from("match_results")
      .select(
        `id, session_id, reported_by, format,
         opponent_id, opponent_name, partner_id, partner_name, opponent2_id, opponent2_name,
         winner_id, outcome, set1_score, set2_score, set3_score, played_at, created_at,
         opponent:profiles!match_results_opponent_id_fkey(id,name,avatar_url,ntrp),
         opponent2:profiles!match_results_opponent2_id_fkey(id,name,avatar_url,ntrp),
         partner:profiles!match_results_partner_id_fkey(id,name,avatar_url,ntrp),
         reporter:profiles!match_results_reported_by_fkey(id,name,avatar_url,ntrp),
         session:sessions(format, proposer_id, partner_id, proposer_partner_id, opponent_partner_id,
           proposer:profiles!sessions_proposer_id_fkey(id,name,avatar_url,ntrp),
           partner:profiles!sessions_partner_id_fkey(id,name,avatar_url,ntrp),
           proposer_partner:profiles!sessions_proposer_partner_id_fkey(id,name,avatar_url,ntrp),
           opponent_partner:profiles!sessions_opponent_partner_id_fkey(id,name,avatar_url,ntrp))`
      )
      .order("played_at", { ascending: false });
    if (error) throw error;

    return data.map((r) => {
      let format, team1, team2;
      if (r.session) {
        format = r.session.format;
        team1 = [r.session.proposer, r.session.proposer_partner].filter(Boolean);
        team2 = [r.session.partner, r.session.opponent_partner].filter(Boolean);
      } else {
        format = r.format;
        team1 = [
          { id: r.reported_by, name: r.reporter?.name },
          r.partner || (r.partner_name ? { name: r.partner_name } : null),
        ].filter(Boolean);
        team2 = [
          r.opponent || (r.opponent_name ? { name: r.opponent_name } : null),
          r.opponent2 || (r.opponent2_name ? { name: r.opponent2_name } : null),
        ].filter(Boolean);
      }
      const onTeam1 = r.reported_by === userId || team1.some((p) => p.id === userId);

      let viewerOutcome;
      if (r.outcome !== null) {
        viewerOutcome = onTeam1 ? r.outcome : r.outcome === "won" ? "lost" : r.outcome === "lost" ? "won" : "none";
      } else {
        viewerOutcome = r.winner_id === null ? "none" : r.winner_id === userId ? "won" : "lost";
      }

      return {
        ...r,
        format,
        myTeam: onTeam1 ? team1 : team2,
        opponents: onTeam1 ? team2 : team1,
        viewerOutcome,
        canEdit: r.reported_by === userId,
      };
    });
  },
};

// ──────────────────────────  MESSAGES  ───────────────────────────

export const messages = {
  /**
   * Fetch the full thread between two users.
   * Supabase doesn't support symmetric OR queries neatly, so we
   * fetch both directions and merge client-side.
   */
  getThread: async (userA, userB) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userA},recipient_id.eq.${userB}),` +
        `and(sender_id.eq.${userB},recipient_id.eq.${userA})`
      )
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },

  /** Send a message */
  send: async (senderId, recipientId, body) => {
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: senderId, recipient_id: recipientId, body })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Mark all messages from sender as read */
  markRead: async (senderId, recipientId) => {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", senderId)
      .eq("recipient_id", recipientId)
      .eq("read", false);
  },

  /**
   * Subscribe to new messages in a thread (Realtime).
   * Returns an unsubscribe function — call it in useEffect cleanup.
   *
   * Usage:
   *   const unsub = messages.subscribe(myId, theirId, (msg) => setMsgs(m => [...m, msg]));
   *   return () => unsub();
   */
  subscribe: (userA, userB, onMessage) => {
    const channel = supabase
      .channel(`thread:${[userA, userB].sort().join(":")}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          // Filter on the Supabase side — only rows involving these two users
          filter: `sender_id=in.(${userA},${userB})`,
        },
        (payload) => {
          const msg = payload.new;
          // Drop messages that aren't in this thread
          const inThread =
            (msg.sender_id === userA && msg.recipient_id === userB) ||
            (msg.sender_id === userB && msg.recipient_id === userA);
          if (inThread) onMessage(msg);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
};
