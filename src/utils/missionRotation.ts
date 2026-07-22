import type { Mission } from "../types";

/**
 * Deterministic "today's 5 missions" selection — same `dateKey` always
 * produces the same selection, for every user, with no Firestore storage and
 * no per-user randomization: the selection is a pure function of the date
 * string alone, nothing else. Different `dateKey` (i.e. a new day) always
 * produces a different-looking shuffle. No cryptographic strength is
 * needed here, just determinism.
 */

/** djb2-style string hash — simple, deterministic, good enough for seeding a shuffle. */
function hashDateKey(dateKey: string): number {
  let hash = 5381;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 33) ^ dateKey.charCodeAt(i);
  }
  return hash >>> 0; // force unsigned 32-bit
}

/** mulberry32 — a small, deterministic PRNG seeded by a single 32-bit integer. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  const random = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Selects exactly `count` missions from `allMissions`, deterministically
 * seeded by `dateKey` (e.g. "2026-07-22"). Same date -> same result, for
 * every caller; a different date -> a different (but still deterministic)
 * result.
 */
export function getTodaysMissions(allMissions: Mission[], dateKey: string, count = 5): Mission[] {
  const seed = hashDateKey(dateKey);
  return seededShuffle(allMissions, seed).slice(0, count);
}
