# Coy · Discover

[![CI](https://github.com/BEASTXCHAITANYA/coy-discover/actions/workflows/ci.yml/badge.svg)](https://github.com/BEASTXCHAITANYA/coy-discover/actions/workflows/ci.yml)

My take on a swipe-style **Discover** tab for [Coy](https://getcoy.com), built for Part B of the SDE intern assignment.

Swipe right to like, left to pass. You only match when the other person liked you too, and the app never gives away who liked you before that. That second part is Coy's whole promise, so most of my effort went there.

## Getting started

You'll need Node 22.13 or newer (I'm using the built-in `node:sqlite`, so there's nothing native to compile).

```bash
npm install
npm run dev     # opens on http://localhost:3000/discover
npm test
```

The database (`data/coy.db`) creates and seeds itself on first run. There are 32 profiles, and 10 of them have already liked you, so you'll hit a match pretty quickly. Once you've swiped through everyone, hit **Reset demo data** to start over.

## How it's put together

- **Next.js 16 + Tailwind** for the UI, **Motion** for the drag and card animations
- **Route handlers** for the API, backed by **SQLite**
- **Vitest** for tests, and a GitHub Actions workflow that runs type-check, lint, tests and build on every push

All the real logic lives in `src/lib/discover.ts` as plain functions that take a database handle. The API routes just parse the request and hand off to it, which made the logic easy to test directly.

## API

| Endpoint | What it does |
|---|---|
| `GET /feed` | Profiles you haven't swiped on yet |
| `POST /swipe` | Body `{ profileId, action: "like" \| "pass" }`. Returns `{ matched: false }` or `{ matched: true, match }` |
| `GET /matches` | Your mutual matches, newest first |

These are also available under `/api/*`. `/swipe` rejects bad input with a proper status: `400` for invalid data, `404` for an unknown profile, `409` if you've already swiped that person, and `429` if you swipe faster than a human could.

## Keeping likes private

This was the part I cared about most. All of these have tests:

- **The feed gives nothing away.** It only returns public profile fields, and the order is fixed when the data is seeded, so people who liked you don't float to the top. I check that the feed is identical with and without incoming likes.
- **Passing reveals nothing.** Passing on someone who liked you gets the same response as passing on anyone else. Like and pass also run the same queries, so you can't read anything from response times.
- **Swipes are final.** You can't pass on someone and then like them to test whether they liked you. Coy has the same rule for adding crushes, which is also why I left out an undo button.
- **Matches are strictly mutual.** A match is created in one transaction, only after both likes exist. Even two identical requests sent at the same moment produce just one match.
- **No scripted probing.** Swipes are rate-limited, and unexpected fields in the request body are rejected.

## Small UX touches

- Cards tilt as you drag and show a LIKE or PASS stamp, and the button you're heading towards grows. Short drags spring back.
- On desktop you can use the buttons or the ← / → keys.
- A one-time hint on first visit shows that the cards can be dragged.
- Swipes feel instant. If saving fails, the card comes back and you get a message.
- There are loading, error and "all caught up" states, plus a **New** badge on matches you haven't seen yet.
- Light and dark mode, reduced-motion support, screen-reader labels, and comfortable tap targets.
- The avatars are illustrated placeholders, so no real faces are used.

## What I'd do next

- SQLite won't persist on serverless hosting like Vercel, so a hosted demo would need Postgres. The logic itself wouldn't change.
- The rate limiter keeps its counts in memory, which is fine for one server. With more than one, I'd move it to something shared like Redis.
- There's a single demo user and no login, as the brief allows. Every function already takes a user ID, so adding real accounts wouldn't need much rework.
