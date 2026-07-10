-- ═══════════════════════════════════════════════════════════════════
--  RALLY — Demo player seed
--  Run in: Supabase Dashboard → SQL Editor, AFTER schema.sql.
--  Safe to re-run — fixed UUIDs + ON CONFLICT DO NOTHING throughout.
--
--  This inserts directly into auth.users + auth.identities, which fires
--  the existing handle_new_user trigger and creates a matching profiles
--  row for each one, then fills in the fields a real signup wouldn't
--  have (ntrp, lat/lng, availability) so they show up as real candidates
--  in find_matches(). Because the identities row is included, these
--  accounts CAN be signed into through the UI — useful for testing both
--  sides of a proposed session (accept/decline, messaging, etc).
--
--  Sign in with any of the emails below and password:
--    demo-password-not-for-login
--  (yes, the password literal says "not for login" — it's a leftover
--  name from an earlier draft of this script; it works fine as a
--  regular password now that the identities row is included.)
--
--  Cleanup when you're done demoing:
--    delete from auth.users where email like '%@gmail.com';
--  (cascades through profiles → availability_slots/sessions/messages)
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

do $$
declare
  demo_password text := crypt('demo-password-not-for-login', gen_salt('bf'));
  players jsonb := '[
    {"id":"00000000-0000-0000-0000-000000000001","email":"marcus.demo@gmail.com","name":"Marcus Bell",  "ntrp":4.0,"lat":33.958,"lng":-83.377,"intent":["Match practice","Competitive sets"],"home_court":"Bishop Park",        "hand":"Right","racket":"Babolat Pure Aero"},
    {"id":"00000000-0000-0000-0000-000000000002","email":"priya.demo@gmail.com", "name":"Priya Nair",   "ntrp":4.5,"lat":33.945,"lng":-83.370,"intent":["Competitive sets"],                 "home_court":"Dan Magill Complex", "hand":"Right","racket":"Yonex VCORE 98"},
    {"id":"00000000-0000-0000-0000-000000000004","email":"jordan.demo@gmail.com","name":"Jordan Ames",  "ntrp":4.0,"lat":33.921,"lng":-83.343,"intent":["Match practice"],                    "home_court":"SE Clarke Park",      "hand":"Right","racket":"Wilson Ultra 100"},
    {"id":"00000000-0000-0000-0000-000000000005","email":"lena.demo@gmail.com",  "name":"Lena Fox",     "ntrp":3.5,"lat":33.983,"lng":-83.381,"intent":["Casual rally"],                     "home_court":"Memorial Park",       "hand":"Right","racket":"Prince Textreme"},
    {"id":"00000000-0000-0000-0000-000000000006","email":"dev.demo@gmail.com",   "name":"Dev Okafor",   "ntrp":4.5,"lat":33.959,"lng":-83.377,"intent":["Match practice","Drilling"],         "home_court":"Bishop Park",        "hand":"Right","racket":"Wilson Blade 98"},
    {"id":"00000000-0000-0000-0000-000000000007","email":"sofia.demo@gmail.com", "name":"Sofia Marino", "ntrp":4.0,"lat":33.971,"lng":-83.401,"intent":["Competitive sets","Match practice"],  "home_court":"Holland Park",        "hand":"Right","racket":"Babolat Pure Drive"}
  ]'::jsonb;
  p jsonb;
  slot_sets jsonb := '[
    ["Mon-EVE","Wed-EVE","Sat-AM"],
    ["Sat-AM","Sat-PM","Sun-AM"],
    ["Sat-PM","Sun-AM","Sun-PM"],
    ["Tue-AM","Thu-AM","Sat-AM"],
    ["Mon-EVE","Sat-AM","Sat-PM"],
    ["Sun-AM","Sun-PM","Wed-EVE"]
  ]'::jsonb;
  i int := 0;
  slot text;
begin
  for p in select * from jsonb_array_elements(players) loop
    i := i + 1;

    -- 1. Create the auth user — fires handle_new_user() → creates the profiles row
    -- confirmation_token/recovery_token/email_change/email_change_token_new
    -- must be '' not NULL — GoTrue scans these as non-nullable strings, and a
    -- NULL here 500s auth for the whole project (every login/signup), not
    -- just this row.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000',
      (p->>'id')::uuid,
      'authenticated', 'authenticated',
      p->>'email', demo_password,
      now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p->>'name'),
      now(), now(), '', '',
      '', ''
    )
    on conflict (id) do nothing;

    -- 1b. Link an "email" identity — Supabase Auth needs this row (separate
    -- from auth.users) to resolve email/password sign-in. Without it, these
    -- accounts exist but can't actually be logged into through the UI.
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      (p->>'id')::uuid,
      jsonb_build_object('sub', (p->>'id')::text, 'email', p->>'email'),
      'email',
      (p->>'id')::text,
      now(), now(), now()
    )
    on conflict (provider, provider_id) do nothing;

    -- 2. Flesh out the profile the trigger just created
    update public.profiles set
      ntrp       = (p->>'ntrp')::numeric,
      lat        = (p->>'lat')::double precision,
      lng        = (p->>'lng')::double precision,
      intent     = array(select jsonb_array_elements_text(p->'intent')),
      home_court = p->>'home_court',
      hand       = p->>'hand',
      racket     = p->>'racket'
    where id = (p->>'id')::uuid;

    -- 3. Availability so there's real overlap to match against
    for slot in select * from jsonb_array_elements_text(slot_sets->(i - 1)) loop
      insert into public.availability_slots (profile_id, day, period)
      values ((p->>'id')::uuid, split_part(slot, '-', 1), split_part(slot, '-', 2))
      on conflict (profile_id, day, period) do nothing;
    end loop;
  end loop;
end $$;
