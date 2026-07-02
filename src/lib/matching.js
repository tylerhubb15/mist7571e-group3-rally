// Rally matching engine — weighted compatibility scoring.
// Weights: skill 35%, availability overlap 30%, distance 20%, intent 15%.
// The same formula lives server-side in supabase/schema.sql (find_matches).

import { INTENTS } from "../data/mockData.js";

const intentRank = (intent) => INTENTS.indexOf(intent);

export function scoreOf(me, player) {
  const skill = Math.max(0, 1 - Math.abs(me.ntrp - player.ntrp) / 1.5);
  const dist = Math.max(0, 1 - player.dist / me.radius);
  const overlap = player.slots.filter((s) => me.slots.includes(s));
  const avail = me.slots.length
    ? overlap.length / Math.min(me.slots.length, player.slots.length)
    : 0;
  const gap = Math.abs(intentRank(me.intent) - intentRank(player.intent));
  const intent = gap === 0 ? 1 : gap === 1 ? 0.6 : 0.25;
  const total = skill * 0.35 + avail * 0.3 + dist * 0.2 + intent * 0.15;

  return {
    total: Math.round(total * 100),
    parts: {
      Skill: Math.round(skill * 100),
      Avail: Math.round(avail * 100),
      Dist: Math.round(dist * 100),
      Intent: Math.round(intent * 100),
    },
    overlap,
  };
}
