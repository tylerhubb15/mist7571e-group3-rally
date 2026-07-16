-- ═══════════════════════════════════════════════════════════════════
--  RALLY — Postgres Schema (Supabase)
--  Run in: Supabase Dashboard → SQL Editor, or via supabase db push
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────  EXTENSIONS  ──────────────────────
create extension if not exists "uuid-ossp";
-- PostGIS gives us geo indexing; enable it in Supabase Dashboard →
-- Database → Extensions → postgis.  The haversine fallback below
-- works without it if you skip the spatial index.

-- ─────────────────────────────  PROFILES  ────────────────────────
-- Mirrors auth.users 1-to-1. Created automatically via trigger.
create table if not exists public.profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  first_name    text        not null,
  last_name     text        not null default '',
  -- Kept as a generated column so every existing query/component that
  -- reads `name` (find_matches, session/message joins, Avatar, etc.)
  -- keeps working unchanged — first_name/last_name are the real fields.
  name          text        generated always as (trim(first_name || ' ' || last_name)) stored,
  ntrp          numeric(2,1) not null default 3.5
                check (ntrp >= 1.0 and ntrp <= 7.0),
  lat           double precision,
  lng           double precision,
  radius_mi     int         not null default 10,
  intent        text[]      not null default array['Match practice']
                check (intent <@ array['Casual rally','Drilling','Competitive sets','Match practice']::text[])
                check (cardinality(intent) > 0),
  -- What you play — either or both. Purely informational for now (not
  -- factored into find_matches); used when booking/logging a match so
  -- doubles proposals know who's up for a 4th.
  formats       text[]      not null default array['Singles']
                check (formats <@ array['Singles','Doubles']::text[])
                check (cardinality(formats) > 0),
  surfaces      text[]      not null default array['Hard'],
  hand          text        not null default 'Right'
                check (hand in ('Right','Left','Ambidextrous')),
  racket        text,
  home_court    text,
  bio           text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- Lets find_matches() narrow to a lat/lng bounding box via an index range
-- scan before it computes exact haversine distance, instead of running
-- the trig math over every row in the table. A PostGIS geography column +
-- GiST index (see the EXTENSIONS note above) is the more precise long-term
-- fix; this needs no extra extension and is a drop-in win today.
create index if not exists profiles_lat_lng_idx on public.profiles(lat, lng);

-- Migration for databases that already have `profiles` without `formats`.
alter table public.profiles add column if not exists formats text[] not null default array['Singles'];
do $$
begin
  alter table public.profiles add constraint profiles_formats_check check (
    formats <@ array['Singles','Doubles']::text[] and cardinality(formats) > 0
  );
exception when duplicate_object then null;
end $$;

-- ─────────────────────────  AVAILABILITY SLOTS  ──────────────────
-- Normalized: one row per (player, day, period) combo.
-- Easier to query overlap than a text[] column.
create table if not exists public.availability_slots (
  id            uuid        primary key default uuid_generate_v4(),
  profile_id    uuid        not null references public.profiles(id) on delete cascade,
  day           text        not null check (day in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  period        text        not null check (period in ('AM','PM','EVE')),
  unique (profile_id, day, period)
);
create index if not exists avail_profile_idx on public.availability_slots(profile_id);

-- ─────────────────────────────  SESSIONS  ────────────────────────
-- proposer_id/partner_id are always the two people who set the booking
-- up. For doubles, proposer_partner_id/opponent_partner_id fill out the
-- other two spots on each side of the net — proposer's team is
-- (proposer_id, proposer_partner_id), the other team is (partner_id,
-- opponent_partner_id). Both null for singles.
create table if not exists public.sessions (
  id                  uuid        primary key default uuid_generate_v4(),
  proposer_id         uuid        not null references public.profiles(id) on delete cascade,
  partner_id          uuid        not null references public.profiles(id) on delete cascade,
  format              text        not null default 'Singles'
                      check (format in ('Singles','Doubles')),
  proposer_partner_id uuid        references public.profiles(id) on delete cascade,
  opponent_partner_id uuid        references public.profiles(id) on delete cascade,
  slot_day            text        not null,   -- 'Sat'
  slot_period         text        not null,   -- 'AM'
  court               text        not null,
  status              text        not null default 'pending'
                      check (status in ('pending','confirmed','declined','cancelled')),
  proposed_at         timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint sessions_participants_check check (
    proposer_id <> partner_id
    and (format = 'Singles' and proposer_partner_id is null and opponent_partner_id is null
         or format = 'Doubles' and proposer_partner_id is not null and opponent_partner_id is not null)
    and (proposer_partner_id is null or proposer_partner_id not in (proposer_id, partner_id))
    and (opponent_partner_id is null or opponent_partner_id not in (proposer_id, partner_id))
    and (proposer_partner_id is null or opponent_partner_id is null or proposer_partner_id <> opponent_partner_id)
  )
);
create index if not exists sessions_proposer_idx on public.sessions(proposer_id);
create index if not exists sessions_partner_idx  on public.sessions(partner_id);
-- Doubles-only columns, but sessions_select/sessions_update RLS checks
-- auth.uid() against all four participant columns on every query — without
-- these, a doubles player who's only in one of these two slots forces a
-- scan since only 2 of the 4 OR-ed columns would otherwise be indexed.
create index if not exists sessions_proposer_partner_idx on public.sessions(proposer_partner_id);
create index if not exists sessions_opponent_partner_idx on public.sessions(opponent_partner_id);

-- Migration for databases that already have `sessions` in the old
-- 2-player-only shape.
alter table public.sessions add column if not exists format text not null default 'Singles' check (format in ('Singles','Doubles'));
alter table public.sessions add column if not exists proposer_partner_id uuid references public.profiles(id) on delete cascade;
alter table public.sessions add column if not exists opponent_partner_id uuid references public.profiles(id) on delete cascade;
do $$
begin
  alter table public.sessions drop constraint if exists sessions_participants_check;
  alter table public.sessions add constraint sessions_participants_check check (
    proposer_id <> partner_id
    and (format = 'Singles' and proposer_partner_id is null and opponent_partner_id is null
         or format = 'Doubles' and proposer_partner_id is not null and opponent_partner_id is not null)
    and (proposer_partner_id is null or proposer_partner_id not in (proposer_id, partner_id))
    and (opponent_partner_id is null or opponent_partner_id not in (proposer_id, partner_id))
    and (proposer_partner_id is null or opponent_partner_id is null or proposer_partner_id <> opponent_partner_id)
  );
end $$;

-- ─────────────────────────────  MATCH RESULTS  ───────────────────
-- A result comes from exactly one of three sources for its "opponent 1"
-- identity:
--   1. a confirmed session (session_id set — all players, and format,
--      come from the session; opponent_id/opponent_name null)
--   2. logged by hand against another Rally user (session_id null,
--      opponent_id set) — visible to and counts for both players
--   3. logged by hand against someone with no Rally account, e.g. match
--      history from before you joined (session_id + opponent_id null,
--      opponent_name set) — private to the reporter, since there's no
--      second account to share it with
-- Editable only by whoever originally reported it. Stats only — this
-- never touches profiles.ntrp, which stays self-reported.
--
-- partner_id/partner_name (your doubles partner) and opponent2_id/
-- opponent2_name (the second opponent) only apply to manually-logged
-- doubles rows (session_id null, format = 'Doubles') — both optional,
-- since you might not remember/care to record every player.
--
-- winner_id records an individual profile and only makes sense when
-- there's exactly one identifiable opposing profile: a session-linked
-- or opponent_id-linked SINGLES match. Everything else — doubles (the
-- win belongs to a team, not one profile) or a freeform opponent (no
-- profile to point at) — instead records outcome: "did reported_by's
-- side win," which the app inverts for the other side's own view.
create table if not exists public.match_results (
  id             uuid        primary key default uuid_generate_v4(),
  session_id     uuid        references public.sessions(id) on delete cascade,
  reported_by    uuid        not null references public.profiles(id) on delete cascade,
  format         text        check (format in ('Singles','Doubles')),
  opponent_id    uuid        references public.profiles(id) on delete cascade,
  opponent_name  text,
  opponent2_id   uuid        references public.profiles(id) on delete cascade,
  opponent2_name text,
  partner_id     uuid        references public.profiles(id) on delete cascade,
  partner_name   text,
  winner_id      uuid        references public.profiles(id) on delete cascade,
  outcome        text        check (outcome in ('won','lost','none')),
  set1_score     text,
  set2_score     text,
  set3_score     text,
  played_at      date        not null default current_date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (session_id),
  constraint match_results_opponent_check check (
    ((session_id is not null)::int + (opponent_id is not null)::int + (opponent_name is not null)::int) = 1
    and (session_id is null or format is null)
    and (session_id is not null or format is not null)
    and (format = 'Doubles' or (partner_id is null and partner_name is null and opponent2_id is null and opponent2_name is null))
    and (opponent_id is null or opponent_id <> reported_by)
    and (partner_id is null or partner_id <> reported_by)
    and (opponent2_id is null or opponent2_id <> reported_by)
  )
);
create index if not exists match_results_session_idx on public.match_results(session_id);
create index if not exists match_results_opponent_idx on public.match_results(opponent_id);
-- match_results_select RLS checks auth.uid() in (reported_by, opponent_id,
-- partner_id, opponent2_id) on every read; reported_by is in the original
-- table shape so it's safe to index here (partner_id/opponent2_id are
-- added below by a later migration for older databases — indexed there
-- instead, once the columns are guaranteed to exist).
create index if not exists match_results_reported_by_idx on public.match_results(reported_by);

-- Migration for databases that already have an older shape — safe to
-- re-run, all guarded. Existing session-linked rows' free-text `score`
-- ("6-4, 6-3") get split into set1_score/set2_score/set3_score.
alter table public.match_results alter column session_id drop not null;
alter table public.match_results add column if not exists opponent_id uuid references public.profiles(id) on delete cascade;
alter table public.match_results add column if not exists opponent_name text;
alter table public.match_results add column if not exists outcome text check (outcome in ('won','lost','none'));
alter table public.match_results add column if not exists set1_score text;
alter table public.match_results add column if not exists set2_score text;
alter table public.match_results add column if not exists set3_score text;
alter table public.match_results add column if not exists played_at date not null default current_date;
alter table public.match_results add column if not exists updated_at timestamptz not null default now();
alter table public.match_results add column if not exists format text check (format in ('Singles','Doubles'));
alter table public.match_results add column if not exists opponent2_id uuid references public.profiles(id) on delete cascade;
alter table public.match_results add column if not exists opponent2_name text;
alter table public.match_results add column if not exists partner_id uuid references public.profiles(id) on delete cascade;
alter table public.match_results add column if not exists partner_name text;
-- partner_id/opponent2_id only exist from this point on (fresh installs
-- already have them from the create table above; this covers upgrades).
create index if not exists match_results_partner_idx   on public.match_results(partner_id);
create index if not exists match_results_opponent2_idx on public.match_results(opponent2_id);

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'match_results' and column_name = 'score') then
    update public.match_results
    set set1_score = nullif(btrim((regexp_split_to_array(score, '\s*,\s*'))[1]), ''),
        set2_score = nullif(btrim((regexp_split_to_array(score, '\s*,\s*'))[2]), ''),
        set3_score = coalesce(
          nullif(btrim((regexp_split_to_array(score, '\s*,\s*'))[3]), ''),
          nullif(btrim(tiebreak_score), '')
        )
    where set1_score is null and (score is not null or tiebreak_score is not null);
    alter table public.match_results drop column score;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'match_results' and column_name = 'tiebreak_score') then
    alter table public.match_results drop column tiebreak_score;
  end if;
  -- Backfill format for existing manual (non-session) rows so the new
  -- NOT-derivable-from-session constraint below is satisfiable.
  update public.match_results set format = 'Singles' where session_id is null and format is null;
end $$;

do $$
begin
  alter table public.match_results drop constraint if exists match_results_opponent_check;
  alter table public.match_results add constraint match_results_opponent_check check (
    ((session_id is not null)::int + (opponent_id is not null)::int + (opponent_name is not null)::int) = 1
    and (session_id is null or format is null)
    and (session_id is not null or format is not null)
    and (format = 'Doubles' or (partner_id is null and partner_name is null and opponent2_id is null and opponent2_name is null))
    and (opponent_id is null or opponent_id <> reported_by)
    and (partner_id is null or partner_id <> reported_by)
    and (opponent2_id is null or opponent2_id <> reported_by)
  );
end $$;
create index if not exists match_results_opponent_idx on public.match_results(opponent_id);

-- ─────────────────────────────  MESSAGES  ────────────────────────
create table if not exists public.messages (
  id            uuid        primary key default uuid_generate_v4(),
  sender_id     uuid        not null references public.profiles(id) on delete cascade,
  recipient_id  uuid        not null references public.profiles(id) on delete cascade,
  body          text        not null,
  read          boolean     not null default false,
  created_at    timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
-- Composite index for fetching a conversation thread efficiently
create index if not exists messages_convo_idx
  on public.messages(least(sender_id::text, recipient_id::text),
                     greatest(sender_id::text, recipient_id::text),
                     created_at);

-- ─────────────────────────────  TRIGGERS  ────────────────────────
-- Auto-create a profile row when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  meta      jsonb := new.raw_user_meta_data;
  full_name text;
  v_first   text;
  v_last    text;
begin
  if meta ? 'first_name' then
    -- Email/password signup — Auth.jsx sends these directly
    v_first := meta->>'first_name';
    v_last  := coalesce(meta->>'last_name', '');
  else
    -- OAuth (Google, etc.) only gives us a single full_name string
    full_name := coalesce(meta->>'full_name', split_part(new.email, '@', 1));
    v_first := split_part(full_name, ' ', 1);
    v_last  := trim(substring(full_name from length(v_first) + 1));
  end if;

  insert into public.profiles (id, first_name, last_name, avatar_url)
  values (new.id, v_first, v_last, meta->>'avatar_url');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at on profile changes
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.touch_updated_at();

drop trigger if exists sessions_updated_at on public.sessions;
create trigger sessions_updated_at before update on public.sessions
  for each row execute procedure public.touch_updated_at();

drop trigger if exists match_results_updated_at on public.match_results;
create trigger match_results_updated_at before update on public.match_results
  for each row execute procedure public.touch_updated_at();

-- ───────────────────────  MATCHING FUNCTION  ─────────────────────
-- Returns ranked hit-partner candidates for a given user_id.
-- Runs entirely in Postgres — no round-trip to the client.
create or replace function public.find_matches(
  p_user_id    uuid,
  p_limit      int  default 20
)
returns table (
  profile_id    uuid,
  name          text,
  ntrp          numeric,
  distance_mi   float,
  intent        text[],
  home_court    text,
  hand          text,
  racket        text,
  bio           text,
  avatar_url    text,
  shared_slots  text[],  -- array of 'Day-Period' strings
  match_score   float    -- 0–100
) language plpgsql stable security definer as $$
declare
  v_me public.profiles%rowtype;
begin
  select * into v_me from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Profile not found for user %', p_user_id;
  end if;

  return query
  with
  -- Haversine distance in miles (no PostGIS required). The bounding-box
  -- filter below runs first and uses profiles_lat_lng_idx to narrow the
  -- candidate set via an index range scan, so acos/cos/sin only run on
  -- profiles roughly within range instead of every row in the table.
  distances as (
    select
      p.id,
      (3958.8 * acos(
        least(1.0, cos(radians(v_me.lat)) * cos(radians(p.lat)) *
          cos(radians(p.lng) - radians(v_me.lng)) +
          sin(radians(v_me.lat)) * sin(radians(p.lat))
        )
      )) as dist_mi
    from public.profiles p
    where p.id <> p_user_id
      and p.lat is not null and p.lng is not null
      -- 1 degree latitude ≈ 69mi; longitude degrees shrink with cos(lat).
      -- 25% buffer matches the exact-distance filter applied below.
      and p.lat between v_me.lat - (v_me.radius_mi * 1.25) / 69.0
                     and v_me.lat + (v_me.radius_mi * 1.25) / 69.0
      and p.lng between v_me.lng - (v_me.radius_mi * 1.25) / (69.0 * cos(radians(v_me.lat)))
                     and v_me.lng + (v_me.radius_mi * 1.25) / (69.0 * cos(radians(v_me.lat)))
  ),
  -- How many slots overlap between this user and each candidate
  slot_overlap as (
    select
      a2.profile_id,
      array_agg(a2.day || '-' || a2.period order by a2.day, a2.period) as shared
    from public.availability_slots a1
    join public.availability_slots a2
      on a1.day = a2.day and a1.period = a2.period
    where a1.profile_id = p_user_id
      and a2.profile_id <> p_user_id
    group by a2.profile_id
  ),
  my_slot_count as (
    select count(*)::float as cnt
    from public.availability_slots a
    where a.profile_id = p_user_id
  ),
  scored as (
    select
      p.id,
      p.name,
      p.ntrp,
      d.dist_mi,
      p.intent,
      p.home_court,
      p.hand,
      p.racket,
      p.bio,
      p.avatar_url,
      coalesce(so.shared, array[]::text[]) as shared_slots,
      -- ── Weighted scoring ───────────────────────────────────────
      -- Skill proximity  35%  (within 1.5 NTRP = full range)
      -- Slot overlap     30%  (fraction of user's slots matched)
      -- Distance         20%  (within radius = 1.0, outside = 0)
      -- Intent match     15%  (exact=1, adjacent=0.6, far=0.25)
      round((
        (greatest(0.0, 1.0 - abs(v_me.ntrp - p.ntrp) / 1.5) * 0.35 +
        (coalesce(array_length(so.shared,1),0)::float / greatest(1.0,(select cnt from my_slot_count))) * 0.30 +
        greatest(0.0, 1.0 - d.dist_mi / v_me.radius_mi) * 0.20 +
        -- Best pairwise match across every (my intent, their intent) combo —
        -- sharing any one goal in common counts as a strong signal.
        (select max(
           case abs(
             array_position(array['Casual rally','Drilling','Competitive sets','Match practice'], mi) -
             array_position(array['Casual rally','Drilling','Competitive sets','Match practice'], ti)
           ) when 0 then 1.0 when 1 then 0.6 else 0.25 end
         )
         from unnest(v_me.intent) as mi, unnest(p.intent) as ti
        ) * 0.15) * 100.0
      )::numeric, 1)::float as match_score
    from public.profiles p
    join distances d on d.id = p.id
    left join slot_overlap so on so.profile_id = p.id
    where d.dist_mi <= (v_me.radius_mi * 1.25)  -- 25% buffer so near-edge players appear
  )
  select
    s.id, s.name, s.ntrp, s.dist_mi, s.intent,
    s.home_court, s.hand, s.racket, s.bio, s.avatar_url,
    s.shared_slots, s.match_score
  from scored s
  order by s.match_score desc
  limit p_limit;
end;
$$;

-- ──────────────────────  ROW LEVEL SECURITY  ─────────────────────
alter table public.profiles          enable row level security;
alter table public.availability_slots enable row level security;
alter table public.sessions          enable row level security;
alter table public.match_results     enable row level security;
alter table public.messages          enable row level security;

-- Profiles: anyone authenticated can read; only owner can write
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update to authenticated using (id = auth.uid());

-- Availability: same as profiles
create policy "avail_select" on public.availability_slots for select to authenticated using (true);
create policy "avail_insert" on public.availability_slots for insert to authenticated with check (profile_id = auth.uid());
create policy "avail_delete" on public.availability_slots for delete to authenticated using (profile_id = auth.uid());

-- Sessions: visible to all four participants for doubles (just the two
-- for singles, since proposer_partner_id/opponent_partner_id are null).
drop policy if exists "sessions_select" on public.sessions;
create policy "sessions_select" on public.sessions for select to authenticated
  using (auth.uid() in (proposer_id, partner_id, proposer_partner_id, opponent_partner_id));
drop policy if exists "sessions_insert" on public.sessions;
create policy "sessions_insert" on public.sessions for insert to authenticated
  with check (proposer_id = auth.uid());
drop policy if exists "sessions_update" on public.sessions;
create policy "sessions_update" on public.sessions for update to authenticated
  using (auth.uid() in (proposer_id, partner_id, proposer_partner_id, opponent_partner_id));

-- Match results: visible to every Rally-user participant either way
-- (session parties for source 1; reported_by + opponent_id/partner_id/
-- opponent2_id for source 2 — any that are set, singles or doubles);
-- private to the reporter when the opponent is a freeform name (source
-- 3 — no second account to share it with). Writable/editable only by
-- whoever reported it. (winner_id/outcome correctness beyond basic
-- shape is left to the app, not re-validated here.)
drop policy if exists "match_results_select" on public.match_results;
create policy "match_results_select" on public.match_results for select to authenticated
  using (
    (session_id is not null and exists (
      select 1 from public.sessions s
      where s.id = session_id
        and auth.uid() in (s.proposer_id, s.partner_id, s.proposer_partner_id, s.opponent_partner_id)
    ))
    or (session_id is null and auth.uid() in (reported_by, opponent_id, partner_id, opponent2_id))
  );

drop policy if exists "match_results_insert" on public.match_results;
create policy "match_results_insert" on public.match_results for insert to authenticated
  with check (
    reported_by = auth.uid()
    and (
      (session_id is not null and exists (
        select 1 from public.sessions s
        where s.id = session_id
          and auth.uid() in (s.proposer_id, s.partner_id, s.proposer_partner_id, s.opponent_partner_id)
          and s.status = 'confirmed'
      ))
      or (session_id is null
          and (opponent_id is not null or opponent_name is not null)
          and (partner_id is null or partner_id <> auth.uid())
          and (opponent2_id is null or opponent2_id <> auth.uid()))
    )
  );

drop policy if exists "match_results_update" on public.match_results;
create policy "match_results_update" on public.match_results for update to authenticated
  using (reported_by = auth.uid())
  with check (
    reported_by = auth.uid()
    and (
      (session_id is not null and exists (
        select 1 from public.sessions s
        where s.id = session_id
          and auth.uid() in (s.proposer_id, s.partner_id, s.proposer_partner_id, s.opponent_partner_id)
      ))
      or (session_id is null
          and (opponent_id is not null or opponent_name is not null)
          and (partner_id is null or partner_id <> auth.uid())
          and (opponent2_id is null or opponent2_id <> auth.uid()))
    )
  );

-- Messages: visible only to sender + recipient
create policy "messages_select" on public.messages for select to authenticated
  using (auth.uid() in (sender_id, recipient_id));
create policy "messages_insert" on public.messages for insert to authenticated
  with check (sender_id = auth.uid());
create policy "messages_update" on public.messages for update to authenticated
  using (recipient_id = auth.uid());  -- only recipient can mark read
