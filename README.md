# Coy · Discover

A swipe-based **Discover** tab for [Coy](https://getcoy.com), built for the Coy SDE Intern assignment (Part B).
Swipe right to like and left to pass. A match happens only when both people have liked each other, and **nobody ever learns who liked them unless it is mutual**.

## Run it

Requires **Node.js 22.13+**, because it uses Node's built-in `node:sqlite` (no native modules to compile).

```bash
npm install
npm run dev        # http://localhost:3000 → opens on Discover
npm test           # 36 tests: matching logic, privacy rules, HTTP API, rate limiting
npm run typecheck
npm run lint
```

GitHub Actions (`.github/workflows/ci.yml`) runs the type-check, lint, tests and production build on every push and pull request.

The SQLite database is created and seeded automatically at `data/coy.db` the first time you run the app.
To replay the demo, swipe through everyone and tap **Reset demo data**, or delete `data/coy.db`.

**Demo tip:** 10 of the 32 seeded profiles have already liked you, so a few likes will produce an "It's a match!" screen.

## What's inside

| | |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS 4, Motion (Framer Motion) for drag gestures and animations, Phosphor icons |
| **Backend** | Next.js Route Handlers |
| **Data** | SQLite via `node:sqlite`, persisted to `data/coy.db` |
| **Tests** | Vitest, run against an in-memory database |

```
src/
  lib/
    db.ts            schema, seeding, connection (single logged-in user, ME = 1)
    discover.ts      getFeed / recordSwipe / getMatches: all matching and privacy logic
    discover.test.ts logic and privacy tests (in-memory DB)
    rate-limit.ts    fixed-window limiter for POST /swipe
    seed-data.ts     32 mock profiles (+ the logged-in user)
  app/api/{feed,swipe,matches,reset}/route.ts   thin HTTP wrappers
  app/api/api.test.ts                           HTTP-level tests: status codes, JSON shapes, concurrency
  components/        swipe card, Discover view, match overlay, matches list, tab bar
```

The business logic in `lib/discover.ts` is plain functions that take a database handle. The routes only parse input and map errors to status codes, so the tests exercise the real logic with no HTTP mocking.

## API

The routes live under `/api/*`. Rewrites also serve them at the exact paths named in the assignment (`/feed`, `/swipe`, `/matches`).

| Method & path | Body | Response |
|---|---|---|
| `GET /feed` | n/a | `{ profiles: Profile[] }`: profiles the user hasn't swiped on yet |
| `POST /swipe` | `{ profileId: number, action: "like" \| "pass" }` | `{ matched: false }` or `{ matched: true, match: Match }` |
| `GET /matches` | n/a | `{ matches: Match[] }`: mutual matches only, newest first |
| `POST /api/reset` | n/a | Demo-only reset. Disabled in production unless `COY_ALLOW_RESET=true` |

`Profile` = `{ id, name, age, college, city, bio, interests, photoUrl }`, and `Match` adds `matchedAt`.
`/swipe` validates input strictly and returns these errors:

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_json` / `invalid_body` / `unexpected_field` | Malformed body, or any field other than `profileId` and `action` |
| 400 | `invalid_action` / `invalid_profile` / `self_swipe` | Bad action, non-integer id, or swiping on yourself |
| 404 | `not_found` | Unknown profile |
| 409 | `already_swiped` | Swipes are final |
| 413 | `payload_too_large` | Body over 1 KB |
| 415 | `unsupported_media_type` | Not `application/json` |
| 429 | `rate_limited` | More than 60 swipes a minute from one client (comes with a `Retry-After` header) |

## Privacy decisions

Coy's core promise is that **nobody learns who liked them unless it's mutual**. Every rule below is covered by a test in `discover.test.ts`.

1. **The feed leaks nothing.** Profiles expose an explicit allow-list of public fields: there is no `likedYou`, score or rank. Feed order comes from a random `feed_rank` fixed at seed time, so profiles that liked you aren't boosted or grouped. A test checks that the feed is **byte-for-byte identical** with and without incoming likes.
2. **A pass reveals nothing.** Passing on someone who liked you returns exactly the same response (`{ matched: false }`) as passing on anyone else. A like that doesn't match looks the same whether the other person passed on you or never saw you.
3. **Swipes are final.** `(swiper, target)` is the primary key, so a second swipe is rejected with `409`. Without this you could pass, then like again, and watch for a match to test whether someone liked you. This mirrors Coy's real "adding is final" rule. For the same reason the UI has no undo.
4. **Matches are mutual only.** Matches are created only inside the like path, after confirming the reverse like, in one `BEGIN IMMEDIATE` transaction. They are stored canonically (`user_a < user_b`), so a pair can never match twice, even when two identical requests arrive at once (tested). `/matches` never includes one-sided likes in either direction.
5. **No timing hints.** Like and pass run the same database queries, so response time doesn't reveal whether the other person liked you.
6. **No automated probing.** `/swipe` is rate-limited (60 a minute per client) and rejects unexpected fields, so a script can't hammer the API or slip in extra parameters.
7. **Minimal client state.** The client never receives anything about incoming likes. It can't leak what it doesn't have.

## UX notes

- **Mobile-first.** Drag cards with your finger. The card tilts as you drag, a LIKE or PASS stamp fades in, and a release past 110 px or a fast flick sends it off. Smaller drags spring back.
- **Feedback that tracks your finger.** While you drag, the Like or Pass button you're heading towards grows, so the gesture and the button visibly mean the same thing. Android phones also give a short vibration when a swipe is committed.
- **First-visit hint.** On the first visit the top card nudges left and right, with a "Drag right to like, left to pass" pill. It disappears after the first swipe and is remembered in `localStorage`.
- **No blank cards.** The next four avatars are preloaded while you look at the current one.
- **Desktop.** Pass and Like buttons, plus the **← / →** arrow keys.
- **Optimistic swipes.** The card leaves instantly. If the request fails, it comes back with a toast, so no swipe is lost silently.
- **Match moment.** A full-screen "It's a match!" with both avatars. Focus moves to the dialog and `Esc` closes it.
- **States covered.** Loading skeleton, error with retry, an "all caught up" empty state (which mentions how many matches you have), and an empty Matches list. Matches made since your last visit get a **New** badge.
- **Accessibility.** Labelled icon buttons, 44px+ touch targets, swipes announced through an `aria-live` region, visible focus rings, `prefers-reduced-motion` (no tilt or fly-out, just fades), and light and dark themes.
- **Photos.** Illustrated placeholder avatars from DiceBear (the assignment allows placeholders), so no real people's faces are used.

## Trade-offs and next steps

- **A single demo user, no auth**, as the assignment specifies. Every function takes a `userId`, so adding real users is a wiring change, not a rewrite.
- **SQLite doesn't persist on serverless hosts** such as Vercel. For a hosted demo, swap `lib/db.ts` for Postgres. The logic and tests stay the same.
- **The rate limiter lives in memory**, which is fine for one process. Running several instances would need a shared store such as Redis.
