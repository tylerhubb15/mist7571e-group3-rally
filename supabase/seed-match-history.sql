-- ═══════════════════════════════════════════════════════════════════
--  RALLY — Demo match history seed
--  Run in: Supabase Dashboard → SQL Editor, AFTER seed-demo-players.sql.
--  Safe to re-run — fixed session ids + ON CONFLICT DO NOTHING throughout.
--
--  Creates confirmed sessions + logged results between the seeded demo
--  players so Profile's "Match history" and Calendar's "Confirmed"
--  section have real data to show without manually logging results by
--  hand. Scores are best-of-3 sets, straight race to 6 games per set —
--  no deuce/tiebreak modeling, matching the app's simplified format.
--
--  Cleanup: rides along with the demo players — deleting them (see
--  seed-demo-players.sql) cascades through sessions → match_results too.
-- ═══════════════════════════════════════════════════════════════════

do $$
declare
  marcus uuid := '00000000-0000-0000-0000-000000000001';
  priya  uuid := '00000000-0000-0000-0000-000000000002';
  jordan uuid := '00000000-0000-0000-0000-000000000004';
  lena   uuid := '00000000-0000-0000-0000-000000000005';
  dev    uuid := '00000000-0000-0000-0000-000000000006';
  sofia  uuid := '00000000-0000-0000-0000-000000000007';

  matches jsonb := jsonb_build_array(
    jsonb_build_object('id','00000000-0000-0000-0001-000000000001','a',marcus,'b',priya, 'winner',priya, 'score','6-4, 6-3',      'court','Bishop Park',        'day','Sat','period','AM', 'ago',21),
    jsonb_build_object('id','00000000-0000-0000-0001-000000000002','a',marcus,'b',jordan,'winner',marcus,'score','4-6, 6-3, 6-2', 'court','Dan Magill Complex', 'day','Wed','period','EVE','ago',18),
    jsonb_build_object('id','00000000-0000-0000-0001-000000000003','a',priya, 'b',dev,   'winner',dev,   'score','6-2, 6-4',      'court','Bishop Park',        'day','Sat','period','PM', 'ago',15),
    jsonb_build_object('id','00000000-0000-0000-0001-000000000004','a',jordan,'b',lena,  'winner',jordan,'score','6-3, 2-6, 6-4', 'court','SE Clarke Park',     'day','Sun','period','AM', 'ago',12),
    jsonb_build_object('id','00000000-0000-0000-0001-000000000005','a',lena,  'b',sofia, 'winner',sofia, 'score','6-4, 6-1',      'court','Memorial Park',      'day','Sat','period','AM', 'ago',9),
    jsonb_build_object('id','00000000-0000-0000-0001-000000000006','a',dev,   'b',sofia, 'winner',dev,   'score','6-3, 4-6, 6-2', 'court','Holland Park',       'day','Wed','period','EVE','ago',6),
    jsonb_build_object('id','00000000-0000-0000-0001-000000000007','a',marcus,'b',dev,   'winner',marcus,'score','6-2, 6-4',      'court','Bishop Park',        'day','Sat','period','PM', 'ago',4),
    jsonb_build_object('id','00000000-0000-0000-0001-000000000008','a',priya, 'b',jordan,'winner',priya, 'score','6-4, 3-6, 6-2', 'court','Dan Magill Complex', 'day','Sun','period','AM', 'ago',2)
  );
  m jsonb;
begin
  for m in select * from jsonb_array_elements(matches) loop
    insert into public.sessions (
      id, proposer_id, partner_id, slot_day, slot_period, court, status, proposed_at, updated_at
    ) values (
      (m->>'id')::uuid,
      (m->>'a')::uuid,
      (m->>'b')::uuid,
      m->>'day',
      m->>'period',
      m->>'court',
      'confirmed',
      now() - ((m->>'ago')::int || ' days')::interval,
      now() - ((m->>'ago')::int || ' days')::interval
    )
    on conflict (id) do nothing;

    insert into public.match_results (
      session_id, reported_by, winner_id, set1_score, set2_score, set3_score, played_at, created_at
    )
    values (
      (m->>'id')::uuid,
      (m->>'a')::uuid,
      (m->>'winner')::uuid,
      nullif(btrim((regexp_split_to_array(m->>'score', '\s*,\s*'))[1]), ''),
      nullif(btrim((regexp_split_to_array(m->>'score', '\s*,\s*'))[2]), ''),
      nullif(btrim((regexp_split_to_array(m->>'score', '\s*,\s*'))[3]), ''),
      (now() - ((m->>'ago')::int || ' days')::interval)::date,
      now() - ((m->>'ago')::int || ' days')::interval
    )
    on conflict (session_id) do nothing;
  end loop;
end $$;
