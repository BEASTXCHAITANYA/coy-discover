"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, GraduationCap, HeartStraight, LockSimple } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import type { Match } from "@/lib/discover";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const SEEN_KEY = "coy.matches.lastSeenAt";

/** When the user last opened this list, so newer matches can be marked "New". Per-device convenience only. */
function readLastSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function MatchesView() {
  const reducedMotion = useReducedMotion() ?? false;
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState(false);
  // Read once per visit, before this visit overwrites it (effects can run twice in dev).
  const lastSeenRef = useRef<string | null | undefined>(undefined);

  const load = useCallback(async () => {
    setError(false);
    try {
      const list = await api.matches();
      if (lastSeenRef.current === undefined) lastSeenRef.current = readLastSeen();
      const lastSeen = lastSeenRef.current;
      // First visit: everything is new. Afterwards: only matches since the last visit.
      setNewIds(new Set(list.filter((m) => !lastSeen || m.matchedAt > lastSeen).map((m) => m.id)));
      setMatches(list);
      try {
        localStorage.setItem(SEEN_KEY, new Date().toISOString());
      } catch {}
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    load();
  }, [load]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 px-3 pt-4 pb-3">
        <Link
          href="/discover"
          aria-label="Back to Discover"
          className="grid size-11 place-items-center rounded-full text-fg transition-colors duration-150 hover:bg-surface-muted"
        >
          <ArrowLeft size={22} aria-hidden />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
          {matches && matches.length > 0 && (
            <p className="text-sm text-fg-muted">
              {matches.length} mutual {matches.length === 1 ? "match" : "matches"}
            </p>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        {!matches && !error && (
          <ul className="space-y-3" aria-label="Loading matches">
            {[0, 1, 2].map((i) => (
              <li key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </ul>
        )}

        {error && (
          <div className="py-16 text-center">
            <p className="font-semibold">Couldn&rsquo;t load your matches.</p>
            <button
              type="button"
              onClick={load}
              className="mt-4 h-11 cursor-pointer rounded-full bg-primary px-5 font-semibold text-on-primary"
            >
              Try again
            </button>
          </div>
        )}

        {matches?.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="mb-4 grid size-16 place-items-center rounded-full bg-primary-soft text-primary" aria-hidden>
              <HeartStraight size={32} weight="fill" />
            </span>
            <h2 className="text-xl font-bold tracking-tight">No matches yet</h2>
            <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-fg-muted">
              When someone you like likes you back, they&rsquo;ll show up here.
            </p>
            <Link
              href="/discover"
              className="mt-6 grid h-12 place-items-center rounded-full bg-primary px-6 font-semibold text-on-primary transition-colors duration-150 hover:bg-primary-hover"
            >
              Go to Discover
            </Link>
          </div>
        )}

        {matches && matches.length > 0 && (
          <ul className="space-y-3">
            {matches.map((m, i) => (
              <motion.li
                key={m.id}
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.2 }}
                className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3"
              >
                <div className="size-14 shrink-0 overflow-hidden rounded-full bg-surface-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">
                    {m.name}, {m.age}
                    {newIds.has(m.id) && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-on-primary">
                        New
                      </span>
                    )}
                  </p>
                  <p className="flex items-center gap-1 truncate text-sm text-fg-muted">
                    <GraduationCap size={14} aria-hidden className="shrink-0" /> {m.college}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-fg-muted">{timeAgo(m.matchedAt)}</span>
              </motion.li>
            ))}
          </ul>
        )}

        <p className="mt-8 flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-fg-muted">
          <LockSimple size={14} aria-hidden className="mt-0.5 shrink-0" />
          Only mutual likes appear here. Coy never shows who liked you unless you liked them too.
        </p>
      </div>
    </div>
  );
}
