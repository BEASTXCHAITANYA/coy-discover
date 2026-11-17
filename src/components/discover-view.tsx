"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { ArrowClockwise, HandSwipeRight, Heart, Sparkle, X } from "@phosphor-icons/react";
import { api, ApiError } from "@/lib/api";
import type { Match, PublicProfile, SwipeAction } from "@/lib/discover";
import { SWIPE_DISTANCE, SwipeCard } from "./swipe-card";
import { MatchOverlay } from "./match-overlay";

type Status = "loading" | "ready" | "error";

const HINT_KEY = "coy.discover.hintSeen";

function readHintSeen(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true; // storage blocked: skip the hint rather than show it forever
  }
}

export function DiscoverView() {
  const reducedMotion = useReducedMotion() ?? false;
  const dragX = useMotionValue(0);
  const [showHint, setShowHint] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [direction, setDirection] = useState<SwipeAction>("like");
  const [match, setMatch] = useState<Match | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [feed, matches] = await Promise.all([api.feed(), api.matches()]);
      setProfiles(feed);
      setMatchCount(matches.length);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    load();
    // localStorage is only available after hydration, so read it here.
    setShowHint(!readHintSeen());
  }, [load]);

  // Warm the cache for the next few avatars so cards never appear blank.
  useEffect(() => {
    for (const p of profiles.slice(1, 5)) {
      const img = new Image();
      img.src = p.photoUrl;
    }
  }, [profiles]);

  const swipe = useCallback(
    async (action: SwipeAction) => {
      const current = profiles[0];
      if (!current || match) return;

      if (showHint) {
        setShowHint(false);
        try {
          localStorage.setItem(HINT_KEY, "1");
        } catch {}
      }
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
      animate(dragX, 0, { duration: 0.2 });

      // Optimistic: the card leaves immediately, the request runs behind it.
      setDirection(action);
      setProfiles((list) => list.filter((p) => p.id !== current.id));
      setAnnouncement(action === "like" ? `Liked ${current.name}` : `Passed on ${current.name}`);

      try {
        const result = await api.swipe(current.id, action);
        if (result.matched) {
          setMatch(result.match);
          setMatchCount((n) => n + 1);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) return; // already recorded: nothing to undo
        setProfiles((list) => [current, ...list]); // put the card back so nothing is lost
        showToast("Couldn't save that swipe. Check your connection and try again.");
      }
    },
    [profiles, match, showToast, showHint, dragX],
  );

  // Desktop keyboard support: ← pass, → like.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (match || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") swipe("pass");
      if (e.key === "ArrowRight") swipe("like");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [swipe, match]);

  async function resetDemo() {
    try {
      await api.reset();
      await load();
    } catch {
      showToast("Reset is only available in the local demo.");
    }
  }

  const visible = profiles.slice(0, 3);
  const top = profiles[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
          <p className="text-sm text-fg-muted">They only find out if you both like each other.</p>
        </div>
        <Link
          href="/discover/matches"
          aria-label={`Matches${matchCount ? `, ${matchCount}` : ""}`}
          className="relative grid size-11 place-items-center rounded-full bg-primary-soft text-primary transition-transform duration-150 active:scale-95"
        >
          <Heart size={22} weight="fill" aria-hidden />
          {matchCount > 0 && (
            <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold tabular-nums text-on-primary">
              {matchCount}
            </span>
          )}
        </Link>
      </header>

      <section aria-label="Profiles" className="relative mx-5 mb-4 min-h-[420px] flex-1">
        {status === "loading" && <div className="skeleton absolute inset-0 rounded-3xl" aria-label="Loading profiles" />}

        {status === "error" && (
          <EmptyState
            icon={<ArrowClockwise size={32} />}
            title="Couldn't load profiles"
            body="Something went wrong while fetching Discover. Your swipes are safe."
            action={<PrimaryButton onClick={load}>Try again</PrimaryButton>}
          />
        )}

        {status === "ready" && (
          <>
            <AnimatePresence custom={direction}>
              {visible
                .map((profile, depth) => (
                  <SwipeCard
                    key={profile.id}
                    profile={profile}
                    depth={depth}
                    reducedMotion={reducedMotion}
                    dragX={dragX}
                    showHint={showHint}
                    onSwipe={swipe}
                  />
                ))
                .reverse()}
            </AnimatePresence>

            <AnimatePresence>
              {showHint && top && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  className="pointer-events-none absolute inset-x-0 top-3 z-20 mx-auto flex w-fit items-center gap-2 rounded-full bg-fg/85 px-4 py-2 text-sm font-medium text-surface shadow-card"
                >
                  <HandSwipeRight size={18} aria-hidden />
                  Drag right to like, left to pass
                </motion.p>
              )}
            </AnimatePresence>

            {profiles.length === 0 && (
              <EmptyState
                icon={<Sparkle size={32} weight="fill" />}
                title="You're all caught up"
                body={
                  matchCount > 0
                    ? `You've seen everyone for now, and you have ${matchCount} ${matchCount === 1 ? "match" : "matches"}. Swipes are final, so nobody shows up twice.`
                    : "You've seen everyone for now. Swipes are final, so nobody shows up twice."
                }
                action={
                  <div className="flex flex-col items-center gap-2">
                    <Link
                      href="/discover/matches"
                      className="grid h-12 place-items-center rounded-full bg-primary px-6 font-semibold text-on-primary transition-colors duration-150 hover:bg-primary-hover"
                    >
                      See your matches
                    </Link>
                    <button
                      type="button"
                      onClick={resetDemo}
                      className="h-11 cursor-pointer px-4 text-sm font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline"
                    >
                      Reset demo data
                    </button>
                  </div>
                }
              />
            )}
          </>
        )}
      </section>

      <div className="flex items-center justify-center gap-6 pb-5">
        <ActionButton label="Pass" hint="Left arrow" disabled={!top || !!match} onClick={() => swipe("pass")} tone="pass" dragX={dragX}>
          <X size={30} weight="bold" aria-hidden />
        </ActionButton>
        <ActionButton label="Like" hint="Right arrow" disabled={!top || !!match} onClick={() => swipe("like")} tone="like" dragX={dragX}>
          <Heart size={30} weight="fill" aria-hidden />
        </ActionButton>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-x-0 bottom-24 z-40 mx-auto w-[calc(100%-2.5rem)] max-w-sm rounded-2xl bg-fg px-4 py-3 text-sm text-surface shadow-card"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {match && <MatchOverlay match={match} reducedMotion={reducedMotion} onClose={() => setMatch(null)} />}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({
  label,
  hint,
  tone,
  disabled,
  onClick,
  dragX,
  children,
}: {
  label: string;
  hint: string;
  tone: "like" | "pass";
  disabled: boolean;
  onClick: () => void;
  dragX: MotionValue<number>;
  children: React.ReactNode;
}) {
  // Grow the button the card is being dragged towards, so the gesture and the
  // button visibly mean the same thing.
  const range = tone === "like" ? [0, SWIPE_DISTANCE] : [-SWIPE_DISTANCE, 0];
  const scale = useTransform(dragX, range, tone === "like" ? [1, 1.18] : [1.18, 1], { clamp: true });
  const toneClass =
    tone === "like"
      ? "bg-primary text-on-primary hover:bg-primary-hover"
      : "border border-border bg-surface text-pass hover:bg-pass-soft";
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={`${label} (${hint})`}
      disabled={disabled}
      onClick={onClick}
      style={{ scale }}
      whileTap={{ scale: 0.9 }}
      className={`grid size-16 cursor-pointer place-items-center rounded-full shadow-card transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </motion.button>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 cursor-pointer rounded-full bg-primary px-6 font-semibold text-on-primary transition-colors duration-150 hover:bg-primary-hover"
    >
      {children}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface-muted/50 px-8 text-center">
      <span className="mb-4 grid size-16 place-items-center rounded-full bg-primary-soft text-primary" aria-hidden>
        {icon}
      </span>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <p className="mt-2 mb-6 max-w-xs text-[15px] leading-relaxed text-fg-muted">{body}</p>
      {action}
    </div>
  );
}
