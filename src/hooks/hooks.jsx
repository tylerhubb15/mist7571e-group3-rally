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
import { auth, profiles, matching, sessions, messages } from "../lib/services.js";

// ─────────────────────────────  AUTH  ────────────────────────────

/**
 * useAuth()
 * Returns { user, profile, loading, signIn, signOut }
 *
 * `user`    — Supabase auth user (id, email, etc.)
 * `profile` — profiles row (ntrp, slots, etc.)
 */
export function useAuth() {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
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

  // Fetch profile whenever user id changes
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    profiles.get(user.id).then(setProfile).catch(console.error);
  }, [user?.id]);

  return {
    user,
    profile,
    loading,
    signIn: (provider) => auth.signInWithProvider(provider),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...query, update: update.mutate };
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
    propose:   propose.mutate,
    setStatus: setStatus.mutate,
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
      // Fetch all messages where the user is involved
      const { data, error } = await import("../lib/services.js").then(({ supabase }) =>
        supabase
          .from("messages")
          .select("*, sender:profiles!messages_sender_id_fkey(id,name,avatar_url,ntrp), recipient:profiles!messages_recipient_id_fkey(id,name,avatar_url,ntrp)")
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .order("created_at", { ascending: false })
      );
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
