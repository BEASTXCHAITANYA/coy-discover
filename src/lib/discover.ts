import type { DB } from "./db";

/**
 * Everything the client is ever allowed to see about another person.
 * There is deliberately no "likedYou" / "score" / "rank" field: the feed must
 * not reveal who has liked the user unless it is mutual.
 */
export type PublicProfile = {
  id: number;
  name: string;
  age: number;
  college: string;
  city: string;
  bio: string;
  interests: string[];
  photoUrl: string;
};

export type Match = PublicProfile & { matchedAt: string };

export type SwipeAction = "like" | "pass";

export type SwipeResult =
  | { ok: true; matched: false }
  | { ok: true; matched: true; match: Match }
  | { ok: false; error: SwipeError };

export type SwipeError = "invalid_action" | "invalid_profile" | "not_found" | "self_swipe" | "already_swiped";

type ProfileRow = {
  id: number;
  name: string;
  age: number;
  college: string;
  city: string;
  bio: string;
  interests: string;
  photo_seed: string;
};

const PUBLIC_COLUMNS = "p.id, p.name, p.age, p.college, p.city, p.bio, p.interests, p.photo_seed";

const AVATAR_BACKGROUNDS = ["ffe4e6", "fce7f3", "ede9fe", "e0f2fe", "dcfce7", "fef3c7", "ffedd5"];

export function photoUrl(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = AVATAR_BACKGROUNDS[h % AVATAR_BACKGROUNDS.length];
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}`;
}

function toPublic(row: ProfileRow): PublicProfile {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    college: row.college,
    city: row.city,
    bio: row.bio,
    interests: JSON.parse(row.interests) as string[],
    photoUrl: photoUrl(row.photo_seed),
  };
}

/**
 * Profiles the user has not swiped on yet.
 * Order comes from `feed_rank`, fixed at seed time, so whether someone has
 * liked the user can never influence what shows up first.
 */
export function getFeed(db: DB, userId: number): PublicProfile[] {
  const rows = db
    .prepare(
      `SELECT ${PUBLIC_COLUMNS}
         FROM profiles p
        WHERE p.id <> ?
          AND NOT EXISTS (SELECT 1 FROM swipes s WHERE s.swiper_id = ? AND s.target_id = p.id)
        ORDER BY p.feed_rank, p.id`,
    )
    .all(userId, userId) as ProfileRow[];
  return rows.map(toPublic);
}

/** Mutual matches only, newest first. */
export function getMatches(db: DB, userId: number): Match[] {
  const rows = db
    .prepare(
      `SELECT ${PUBLIC_COLUMNS}, m.created_at AS matched_at
         FROM matches m
         JOIN profiles p ON p.id = CASE WHEN m.user_a = ? THEN m.user_b ELSE m.user_a END
        WHERE m.user_a = ? OR m.user_b = ?
        ORDER BY m.created_at DESC, p.id`,
    )
    .all(userId, userId, userId) as (ProfileRow & { matched_at: string })[];
  return rows.map((r) => ({ ...toPublic(r), matchedAt: r.matched_at }));
}

export function isSwipeAction(value: unknown): value is SwipeAction {
  return value === "like" || value === "pass";
}

/**
 * Records a like or pass and reports whether it created a match.
 *
 * Privacy rules enforced here:
 *  - A match is created only when both people have liked each other.
 *  - A pass returns exactly `{ ok: true, matched: false }` whether or not the
 *    other person liked the user, so passing reveals nothing.
 *  - Swipes are final: a second swipe on the same profile is rejected, so the
 *    user can't flip pass -> like to probe for incoming likes.
 */
export function recordSwipe(db: DB, userId: number, targetId: unknown, action: unknown): SwipeResult {
  if (!isSwipeAction(action)) return { ok: false, error: "invalid_action" };
  if (typeof targetId !== "number" || !Number.isInteger(targetId) || targetId <= 0) {
    return { ok: false, error: "invalid_profile" };
  }
  if (targetId === userId) return { ok: false, error: "self_swipe" };

  db.exec("BEGIN IMMEDIATE");
  try {
    const target = db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM profiles p WHERE p.id = ?`).get(targetId) as
      | ProfileRow
      | undefined;
    if (!target) {
      db.exec("ROLLBACK");
      return { ok: false, error: "not_found" };
    }

    const inserted = db
      .prepare("INSERT OR IGNORE INTO swipes (swiper_id, target_id, action) VALUES (?, ?, ?)")
      .run(userId, targetId, action);
    if (inserted.changes === 0) {
      db.exec("ROLLBACK");
      return { ok: false, error: "already_swiped" };
    }

    // Run the reverse-like lookup for passes too, so like and pass do the same
    // database work and response timing can't hint at who liked the user.
    const likedBack = db
      .prepare("SELECT 1 FROM swipes WHERE swiper_id = ? AND target_id = ? AND action = 'like'")
      .get(targetId, userId);
    if (action === "pass" || !likedBack) {
      db.exec("COMMIT");
      return { ok: true, matched: false };
    }

    const [a, b] = userId < targetId ? [userId, targetId] : [targetId, userId];
    db.prepare("INSERT OR IGNORE INTO matches (user_a, user_b) VALUES (?, ?)").run(a, b);
    const { created_at } = db
      .prepare("SELECT created_at FROM matches WHERE user_a = ? AND user_b = ?")
      .get(a, b) as { created_at: string };
    db.exec("COMMIT");
    return { ok: true, matched: true, match: { ...toPublic(target), matchedAt: created_at } };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
