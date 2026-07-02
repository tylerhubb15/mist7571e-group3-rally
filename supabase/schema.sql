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
  name          text        not null,
  ntrp          numeric(2,1) not null default 3.5
                check (ntrp >= 1.0 and ntrp <= 7.0),
  lat           double precision,
  lng           double precision,
  radius_mi     int         not null default 10,
  intent        text        not null default 'Match practice'
                check (intent in ('Casual rally','Drilling','Competitive sets','Match practice')),
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
create table if not exists public.sessions (
  id            uuid        primary key default uuid_generate_v4(),
  proposer_id   uuid        not null references public.profiles(id) on delete cascade,
  partner_id    uuid        not null references public.profiles(id) on delete cascade,
  slot_day      text        not null,   -- 'Sat'
  slot_period   text        not null,   -- 'AM'
  court         text        not null,
  status        text        not null default 'pending'
                check (status in ('pending','confirmed','declined','cancelled')),
  proposed_at   timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (proposer_id <> partner_id)
);
create index if not exists sessions_proposer_idx on public.sessions(proposer_id);
create index if not exists sessions_partner_idx  on public.sessions(partner_id);

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
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  );
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
  intent        text,
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
  -- Haversine distance in miles (no PostGIS required)
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
    from public.availability_slots
    where profile_id = p_user_id
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
        greatest(0.0, 1.0 - abs(v_me.ntrp - p.ntrp) / 1.5) * 0.35 +
        (coalesce(array_length(so.shared,1),0)::float / greatest(1.0,(select cnt from my_slot_count))) * 0.30 +
        greatest(0.0, 1.0 - d.dist_mi / v_me.radius_mi) * 0.20 +
        (case abs(
          array_position(array['Casual rally','Drilling','Competitive sets','Match practice'], v_me.intent) -
          array_position(array['Casual rally','Drilling','Competitive sets','Match practice'], p.intent)
         ) when 0 then 1.0 when 1 then 0.6 else 0.25 end) * 0.15
      ) * 100.0, 1)::float as match_score
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
alter table public.messages          enable row level security;

-- Profiles: anyone authenticated can read; only owner can write
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update to authenticated using (id = auth.uid());

-- Availability: same as profiles
create policy "avail_select" on public.availability_slots for select to authenticated using (true);
create policy "avail_insert" on public.availability_slots for insert to authenticated with check (profile_id = auth.uid());
create policy "avail_delete" on public.availability_slots for delete to authenticated using (profile_id = auth.uid());

-- Sessions: visible only to the two parties involved
create policy "sessions_select" on public.sessions for select to authenticated
  using (auth.uid() in (proposer_id, partner_id));
create policy "sessions_insert" on public.sessions for insert to authenticated
  with check (proposer_id = auth.uid());
create policy "sessions_update" on public.sessions for update to authenticated
  using (auth.uid() in (proposer_id, partner_id));

-- Messages: visible only to sender + recipient
create policy "messages_select" on public.messages for select to authenticated
  using (auth.uid() in (sender_id, recipient_id));
create policy "messages_insert" on public.messages for insert to authenticated
  with check (sender_id = auth.uid());
create policy "messages_update" on public.messages for update to authenticated
  using (recipient_id = auth.uid());  -- only recipient can mark read
