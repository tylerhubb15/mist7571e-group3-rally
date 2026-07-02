// ═══════════════════════════════════════════════════════════════════
//  RALLY — Supabase Service Layer
//  npm install @supabase/supabase-js
//  Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
// ═══════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─────────────────────────────  AUTH  ────────────────────────────

export const auth = {
  /** Social login — provider: 'google' | 'apple' | 'facebook' */
  signInWithProvider: (provider) =>
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  /** Subscribe to auth state changes (call in App root) */
  onAuthChange: (cb) => supabase.auth.onAuthStateChange((_event, session) => cb(session)),
};

// ──────────────────────────  PROFILES  ───────────────────────────

export const profiles = {
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
  /** All sessions for the current user (both roles) */
  list: async (userId) => {
    const { data, error } = await supabase
      .from("sessions")
      .select(
        `*, 
         proposer:profiles!sessions_proposer_id_fkey(id,name,ntrp,avatar_url),
         partner:profiles!sessions_partner_id_fkey(id,name,ntrp,avatar_url)`
      )
      .or(`proposer_id.eq.${userId},partner_id.eq.${userId}`)
      .order("proposed_at", { ascending: false });
    if (error) throw error;
    // Attach role so the UI knows which side of the session you're on
    return data.map((s) => ({
      ...s,
      role: s.proposer_id === userId ? "proposer" : "partner",
      // 'incoming' if you're the partner and status is pending
      uiStatus:
        s.proposer_id !== userId && s.status === "pending" ? "incoming" : s.status,
    }));
  },

  /** Propose a new session */
  propose: async ({ proposerId, partnerId, slotDay, slotPeriod, court }) => {
    const { data, error } = await supabase
      .from("sessions")
      .insert({ proposer_id: proposerId, partner_id: partnerId, slot_day: slotDay, slot_period: slotPeriod, court })
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
