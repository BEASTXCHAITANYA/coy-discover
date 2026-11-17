import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ME, migrate, openDb, reset, seed, type DB } from "./db";
import { getFeed, getMatches, recordSwipe } from "./discover";
import { SEED_PROFILES } from "./seed-data";

const LIKERS = SEED_PROFILES.flatMap((p, i) => (p.likesYou ? [i + 2] : []));
const NON_LIKERS = SEED_PROFILES.flatMap((p, i) => (p.likesYou ? [] : [i + 2]));
const PUBLIC_KEYS = ["age", "bio", "city", "college", "id", "interests", "name", "photoUrl"];

function freshDb(opts?: { withIncomingLikes?: boolean }): DB {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  seed(db, opts);
  return db;
}

let db: DB;
beforeEach(() => {
  db = freshDb();
});

describe("seed data", () => {
  it("has at least 30 profiles besides the user, some of whom already like the user", () => {
    expect(SEED_PROFILES.length).toBeGreaterThanOrEqual(30);
    expect(LIKERS.length).toBeGreaterThan(0);
    expect(getFeed(db, ME)).toHaveLength(SEED_PROFILES.length);
  });
});

describe("GET /feed logic", () => {
  it("never includes the user themself", () => {
    expect(getFeed(db, ME).some((p) => p.id === ME)).toBe(false);
  });

  it("excludes every profile the user has swiped on, likes and passes alike", () => {
    const [a, b] = getFeed(db, ME);
    recordSwipe(db, ME, a.id, "like");
    recordSwipe(db, ME, b.id, "pass");
    const ids = getFeed(db, ME).map((p) => p.id);
    expect(ids).not.toContain(a.id);
    expect(ids).not.toContain(b.id);
    expect(ids).toHaveLength(SEED_PROFILES.length - 2);
  });

  it("returns only public fields, with nothing that hints at who liked the user", () => {
    for (const p of getFeed(db, ME)) {
      expect(Object.keys(p).sort()).toEqual(PUBLIC_KEYS);
    }
  });

  it("is byte-for-byte identical whether or not anyone has liked the user", () => {
    const withoutLikes = freshDb({ withIncomingLikes: false });
    expect(JSON.stringify(getFeed(db, ME))).toEqual(JSON.stringify(getFeed(withoutLikes, ME)));
  });

  it("is empty once everything has been swiped", () => {
    for (const p of getFeed(db, ME)) recordSwipe(db, ME, p.id, "pass");
    expect(getFeed(db, ME)).toEqual([]);
  });
});

describe("POST /swipe logic", () => {
  it("creates a match when the user likes someone who already liked them", () => {
    const res = recordSwipe(db, ME, LIKERS[0], "like");
    expect(res).toMatchObject({ ok: true, matched: true, match: { id: LIKERS[0] } });
    expect(getMatches(db, ME).map((m) => m.id)).toEqual([LIKERS[0]]);
  });

  it("does not match when the other person has not liked the user", () => {
    expect(recordSwipe(db, ME, NON_LIKERS[0], "like")).toEqual({ ok: true, matched: false });
    expect(getMatches(db, ME)).toEqual([]);
  });

  it("gives an identical response for a pass, whether or not that person liked the user", () => {
    const passOnLiker = recordSwipe(db, ME, LIKERS[0], "pass");
    const passOnOther = recordSwipe(db, ME, NON_LIKERS[0], "pass");
    expect(passOnLiker).toEqual({ ok: true, matched: false });
    expect(passOnOther).toEqual(passOnLiker);
    expect(getMatches(db, ME)).toEqual([]);
  });

  it("gives an identical response for a non-matching like, whatever the reason", () => {
    // Liking someone who passed on you looks the same as liking someone who never saw you.
    db.prepare("INSERT INTO swipes (swiper_id, target_id, action) VALUES (?, ?, 'pass')").run(NON_LIKERS[1], ME);
    expect(recordSwipe(db, ME, NON_LIKERS[1], "like")).toEqual(recordSwipe(db, ME, NON_LIKERS[2], "like"));
  });

  it("makes swipes final: a second swipe is rejected and can't flip pass into like", () => {
    recordSwipe(db, ME, LIKERS[0], "pass");
    expect(recordSwipe(db, ME, LIKERS[0], "like")).toEqual({ ok: false, error: "already_swiped" });
    expect(getMatches(db, ME)).toEqual([]);
  });

  it("never creates a duplicate match when the same like is sent twice", () => {
    recordSwipe(db, ME, LIKERS[0], "like");
    expect(recordSwipe(db, ME, LIKERS[0], "like")).toEqual({ ok: false, error: "already_swiped" });
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM matches").get() as { n: number };
    expect(n).toBe(1);
  });

  it("rejects bad input without writing anything", () => {
    expect(recordSwipe(db, ME, LIKERS[0], "superlike")).toEqual({ ok: false, error: "invalid_action" });
    expect(recordSwipe(db, ME, "2", "like")).toEqual({ ok: false, error: "invalid_profile" });
    expect(recordSwipe(db, ME, 1.5, "like")).toEqual({ ok: false, error: "invalid_profile" });
    expect(recordSwipe(db, ME, 9999, "like")).toEqual({ ok: false, error: "not_found" });
    expect(recordSwipe(db, ME, ME, "like")).toEqual({ ok: false, error: "self_swipe" });
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM swipes WHERE swiper_id = ?").get(ME) as { n: number };
    expect(n).toBe(0);
  });
});

describe("GET /matches logic", () => {
  it("lists only mutual matches, never one-sided likes in either direction", () => {
    recordSwipe(db, ME, LIKERS[0], "like"); // mutual
    recordSwipe(db, ME, NON_LIKERS[0], "like"); // only the user liked
    // LIKERS[1] liked the user, but the user hasn't swiped: must stay hidden.
    const ids = getMatches(db, ME).map((m) => m.id);
    expect(ids).toEqual([LIKERS[0]]);
    expect(ids).not.toContain(LIKERS[1]);
  });

  it("returns public fields plus matchedAt only", () => {
    recordSwipe(db, ME, LIKERS[0], "like");
    expect(Object.keys(getMatches(db, ME)[0]).sort()).toEqual([...PUBLIC_KEYS, "matchedAt"].sort());
  });
});

describe("persistence", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "coy-test-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("keeps swipes and matches after the database is closed and reopened", () => {
    const file = path.join(dir, "coy.db");
    const first = openDb(file);
    recordSwipe(first, ME, LIKERS[0], "like");
    recordSwipe(first, ME, NON_LIKERS[0], "pass");
    first.close();

    const reopened = openDb(file); // seed() must not wipe existing data
    expect(getMatches(reopened, ME).map((m) => m.id)).toEqual([LIKERS[0]]);
    const ids = getFeed(reopened, ME).map((p) => p.id);
    expect(ids).not.toContain(LIKERS[0]);
    expect(ids).not.toContain(NON_LIKERS[0]);
    reopened.close();
  });

  it("reset() restores the original demo state", () => {
    recordSwipe(db, ME, LIKERS[0], "like");
    reset(db);
    expect(getMatches(db, ME)).toEqual([]);
    expect(getFeed(db, ME)).toHaveLength(SEED_PROFILES.length);
  });
});
