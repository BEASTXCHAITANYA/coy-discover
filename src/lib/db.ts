import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { CURRENT_USER, SEED_PROFILES } from "./seed-data";

export type DB = DatabaseSync;

/** Single demo user. No auth: the assignment says to assume one logged-in user. */
export const ME = 1;

const SCHEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS profiles (
    id         INTEGER PRIMARY KEY,
    name       TEXT    NOT NULL,
    age        INTEGER NOT NULL,
    college    TEXT    NOT NULL,
    city       TEXT    NOT NULL,
    bio        TEXT    NOT NULL,
    interests  TEXT    NOT NULL,            -- JSON array
    photo_seed TEXT    NOT NULL,
    feed_rank  INTEGER NOT NULL             -- random order fixed at seed time, independent of likes
  );

  -- One row per (swiper -> target). The primary key makes every swipe final:
  -- a second swipe on the same profile can never be recorded.
  CREATE TABLE IF NOT EXISTS swipes (
    swiper_id  INTEGER NOT NULL REFERENCES profiles(id),
    target_id  INTEGER NOT NULL REFERENCES profiles(id),
    action     TEXT    NOT NULL CHECK (action IN ('like', 'pass')),
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (swiper_id, target_id),
    CHECK (swiper_id <> target_id)
  );

  -- Stored canonically (user_a < user_b) so a pair can only ever match once.
  CREATE TABLE IF NOT EXISTS matches (
    user_a     INTEGER NOT NULL REFERENCES profiles(id),
    user_b     INTEGER NOT NULL REFERENCES profiles(id),
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (user_a, user_b),
    CHECK (user_a < user_b)
  );
`;

/** Deterministic PRNG so the seeded feed order is the same on every machine. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function migrate(db: DB) {
  db.exec(SCHEMA);
}

/** Seeds profiles and the "already liked you" swipes. No-op if already seeded. */
export function seed(db: DB, opts: { withIncomingLikes?: boolean } = {}) {
  const { withIncomingLikes = true } = opts;
  const count = db.prepare("SELECT COUNT(*) AS n FROM profiles").get() as { n: number };
  if (count.n > 0) return;

  const rand = mulberry32(42);
  const ranks = SEED_PROFILES.map((_, i) => i);
  for (let i = ranks.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ranks[i], ranks[j]] = [ranks[j], ranks[i]];
  }

  const insertProfile = db.prepare(
    `INSERT INTO profiles (id, name, age, college, city, bio, interests, photo_seed, feed_rank)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertSwipe = db.prepare(
    "INSERT INTO swipes (swiper_id, target_id, action) VALUES (?, ?, 'like')",
  );

  db.exec("BEGIN");
  try {
    insertProfile.run(
      ME, CURRENT_USER.name, CURRENT_USER.age, CURRENT_USER.college, CURRENT_USER.city,
      CURRENT_USER.bio, JSON.stringify(CURRENT_USER.interests), "coy-you", -1,
    );
    SEED_PROFILES.forEach((p, i) => {
      const id = i + 2;
      insertProfile.run(
        id, p.name, p.age, p.college, p.city, p.bio, JSON.stringify(p.interests),
        `coy-${p.name.toLowerCase()}-${id}`, ranks[i],
      );
      if (withIncomingLikes && p.likesYou) insertSwipe.run(id, ME);
    });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/** Wipes everything and re-seeds. Used by the demo reset and tests. */
export function reset(db: DB) {
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM matches; DELETE FROM swipes; DELETE FROM profiles;");
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  seed(db);
}

export function openDb(file: string): DB {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  migrate(db);
  seed(db);
  return db;
}

// One connection per server process. Kept on globalThis so dev hot-reload
// doesn't open a new handle on every change.
const globalForDb = globalThis as unknown as { __coyDb?: DB };

export function getDb(): DB {
  if (!globalForDb.__coyDb) {
    const file = process.env.COY_DB_PATH ?? path.join(process.cwd(), "data", "coy.db");
    globalForDb.__coyDb = openDb(file);
  }
  return globalForDb.__coyDb;
}
