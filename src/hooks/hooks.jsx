// ═══════════════════════════════════════════════════════════════════
//  RALLY — React Hooks (replace mock data with live Supabase data)
//  npm install @tanstack/react-query
//
//  Wrap your App with:
//    import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
//    const qc = new QueryClient()
//    <QueryClientProvider client={qc}><App/></QueryClientProvider>
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth, profiles, matching, sessions, matchResults, messages, supabase } from "../lib/services.js";
import { fetchNearbyCourts } from "../lib/nearbyCourts.js";

// ─────────────────────────────  AUTH  ────────────────────────────

/**
 * useAuth()
 * Returns { user, loading, signIn, signUp, signOut }
 *
 * `user` — Supabase auth user (id, email, etc.). For the profile row
 * (ntrp, slots, etc.) use useProfile(user.id) — keeps a single
 * React-Query-cached source of truth instead of a second ad-hoc fetch.
 */
export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    // Hydrate from existing session on mount
    auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    // Listen for sign-in / sign-out
    const { data: { subscription } } = auth.onAuthChange((session) => {
      setUser(session?.user ?? null);
      // Bust all cached queries on auth change
      qc.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [qc]);

  return {
    user,
    loading,
    signIn: (provider) => auth.signInWithProvider(provider),
    signUpWithEmail: auth.signUpWithEmail,
    signInWithEmail: auth.signInWithEmail,
    signOut: auth.signOut,
  };
}

// ──────────────────────────  PROFILE  ────────────────────────────

/**
 * useProfile(userId)
 * Read + update a profile. Pass the current user's id for an
 * editable profile, or any other id for a read-only view.
 */
export function useProfile(userId) {
  const qc  = useQueryClient();
  const key = ["profile", userId];

  const query = useQuery({
    queryKey: key,
    queryFn:  () => profiles.get(userId),
    enabled:  !!userId,
    staleTime: 1000 * 60,
  });

  const update = useMutation({
    mutationFn: ({ fields, slots }) =>
      Promise.all([
        fields && profiles.update(userId, fields),
        slots  && profiles.setSlots(userId, slots),
      ]),
    // Match results (Discover) are a function of the profile — lat/lng,
    // radius, ntrp, slots, intent all feed find_matches() server-side —
    // so any profile update needs to invalidate the cached match list too,
    // or Discover keeps showing matches computed before the change until
    // its 5-minute staleTime lapses. Covers both "Use my location" and the
    // Courts city search, since both just call this same update().
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["matches", userId] });
    },
  });

  return {
    ...query,
    update: update.mutate,
    updateAsync: update.mutateAsync,
    updating: update.isPending,
    updateError: update.error,
  };
}

/**
 * useAllProfiles()
 * Lightweight list of every player — used by the courts map to plot pins.
 */
export function useAllProfiles() {
  return useQuery({
    queryKey: ["profiles", "all"],
    queryFn: profiles.listAll,
    staleTime: 1000 * 60,
  });
}

/**
 * useNearbyCourts(lat, lng)
 * Real courts near an arbitrary location via Google Places — supplements
 * the fixed Athens seed list so the Courts tab isn't empty everywhere else
 * in the world. Rounded to ~1.1km in the cache key so minor GPS jitter
 * doesn't trigger a refetch; disabled entirely until a location is
 * actually set (no point spending an API call for the unset default).
 */
export function useNearbyCourts(lat, lng) {
  return useQuery({
    queryKey: ["nearbyCourts", lat?.toFixed(2), lng?.toFixed(2)],
    queryFn: () => fetchNearbyCourts(lat, lng),
    enabled: lat !== null && lng !== null,
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
}

// ──────────────────────────  MATCHING  ───────────────────────────

/**
 * useMatches(userId)
 * Returns a ranked list from the Postgres find_matches() function.
 * Automatically refetches when the user's profile changes (radius, ntrp, etc.)
 */
export function useMatches(userId) {
  return useQuery({
    queryKey: ["matches", userId],
    queryFn:  () => matching.findMatches(userId),
    enabled:  !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

// ──────────────────────────  SESSIONS  ───────────────────────────

/**
 * useSessions(userId)
 * Returns { sessions, propose, setStatus }
 */
export function useSessions(userId) {
  const qc  = useQueryClient();
  const key = ["sessions", userId];

  const query = useQuery({
    queryKey: key,
    queryFn:  () => sessions.list(userId),
    enabled:  !!userId,
    refetchInterval: 30_000,  // poll every 30s (or swap for Realtime)
  });

  const propose = useMutation({
    mutationFn: (args) => sessions.propose({ proposerId: userId, ...args }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: key }),
  });

  const setStatus = useMutation({
    mutationFn: ({ sessionId, status }) => sessions.setStatus(sessionId, status),
    // Optimistic update so the UI feels instant
    onMutate: async ({ sessionId, status }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) =>
        old?.map((s) => (s.id === sessionId ? { ...s, status } : s))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    ...query,
    propose:      propose.mutate,
    proposeAsync: propose.mutateAsync,
    proposing:    propose.isPending,
    setStatus:    setStatus.mutate,
    setStatusError: setStatus.error,
  };
}

// ──────────────────────────  MATCH RESULTS  ──────────────────────

/**
 * useMatchResults(userId)
 * Every logged result the current user has been part of (RLS-scoped —
 * no filter needed client-side beyond passing userId to resolve
 * `opponent`), plus `report` (session-linked), `logManual` (hand-entered
 * history), and `update` (edit one you reported) mutations.
 */
export function useMatchResults(userId) {
  const qc  = useQueryClient();
  const key = ["matchResults", userId];

  const query = useQuery({
    queryKey: key,
    queryFn:  () => matchResults.listForMe(userId),
    enabled:  !!userId,
  });

  const report = useMutation({
    mutationFn: (args) => matchResults.report(args),
    onSuccess:  () => qc.invalidateQueries({ queryKey: key }),
  });

  const logManual = useMutation({
    mutationFn: (args) => matchResults.logManual(args),
    onSuccess:  () => qc.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: ({ id, fields }) => matchResults.update(id, fields),
    onSuccess:  () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    ...query,
    report:         report.mutate,
    reportAsync:    report.mutateAsync,
    reporting:      report.isPending,
    logManual:      logManual.mutate,
    logManualAsync: logManual.mutateAsync,
    loggingManual:  logManual.isPending,
    updateAsync:    update.mutateAsync,
    updating:       update.isPending,
  };
}

// ──────────────────────────  MESSAGES  ───────────────────────────

/**
 * useThread(myId, theirId)
 * Fetches message history and opens a Realtime subscription.
 * Returns { messages, send, markRead }
 */
export function useThread(myId, theirId) {
  const qc  = useQueryClient();
  const key = ["thread", ...[myId, theirId].sort()];

  // Initial fetch
  const query = useQuery({
    queryKey: key,
    queryFn:  () => messages.getThread(myId, theirId),
    enabled:  !!(myId && theirId),
  });

  // Realtime subscription — appends incoming messages to the cache
  useEffect(() => {
    if (!myId || !theirId) return;
    const unsub = messages.subscribe(myId, theirId, (newMsg) => {
      qc.setQueryData(key, (old = []) => [...old, newMsg]);
    });
    return unsub;
  }, [myId, theirId, qc]);

  const send = useCallback(
    (body) => messages.send(myId, theirId, body),
    [myId, theirId]
  );

  const markRead = useCallback(
    () => messages.markRead(theirId, myId),
    [myId, theirId]
  );

  return { ...query, send, markRead };
}

/**
 * useConversations(userId)
 * Returns the list of players the user has exchanged messages with,
 * plus the last message and unread count for each thread.
 * Used in the Messages tab conversation list.
 */
export function useConversations(userId) {
  return useQuery({
    queryKey: ["conversations", userId],
    queryFn: async () => {
      // Bounded to the most recent messages across all threads — enough to
      // build the thread list + preview without re-downloading the user's
      // entire message history on every 15s poll. Threads whose only
      // activity falls outside this window (or unread counts beyond it)
      // won't show up here; a DISTINCT ON (partner)-style server-side
      // query would be the precise long-term fix.
      const { data, error } = await supabase
        .from("messages")
        .select("*, sender:profiles!messages_sender_id_fkey(id,name,avatar_url,ntrp), recipient:profiles!messages_recipient_id_fkey(id,name,avatar_url,ntrp)")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      // Group by conversation partner, keep only the latest message per thread
      const threads = {};
      for (const msg of data) {
        const partner = msg.sender_id === userId ? msg.recipient : msg.sender;
        if (!threads[partner.id]) {
          threads[partner.id] = {
            partner,
            lastMessage: msg,
            unread: 0,
          };
        }
        if (!msg.read && msg.recipient_id === userId) {
          threads[partner.id].unread++;
        }
      }
      return Object.values(threads);
    },
    enabled: !!userId,
    refetchInterval: 15_000,
  });
}
