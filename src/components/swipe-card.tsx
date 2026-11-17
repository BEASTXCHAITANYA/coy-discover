"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform, type MotionValue, type PanInfo } from "motion/react";
import { GraduationCap, MapPin } from "@phosphor-icons/react";
import type { PublicProfile, SwipeAction } from "@/lib/discover";

const SWIPE_DISTANCE = 110; // px past which a release counts as a swipe
const SWIPE_VELOCITY = 600; // px/s flick that counts as a swipe even if short

type Props = {
  profile: PublicProfile;
  /** 0 = top (interactive) card, 1 and 2 = cards peeking underneath. */
  depth: number;
  reducedMotion: boolean;
  /** Shared with the action buttons so they react while the card is dragged. */
  dragX: MotionValue<number>;
  /** First visit only: nudge the card left and right to show it can be swiped. */
  showHint: boolean;
  onSwipe: (action: SwipeAction) => void;
};

export { SWIPE_DISTANCE };

export function SwipeCard({ profile, depth, reducedMotion, dragX, showHint, onSwipe }: Props) {
  const isTop = depth === 0;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], reducedMotion ? [0, 0, 0] : [-14, 0, 14]);
  const likeOpacity = useTransform(x, [24, SWIPE_DISTANCE], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_DISTANCE, -24], [1, 0]);

  useEffect(() => {
    if (!isTop || !showHint || reducedMotion) return;
    const controls = animate(x, [0, 56, -56, 0], { duration: 1.4, ease: "easeInOut", delay: 0.6 });
    return () => controls.stop();
  }, [isTop, showHint, reducedMotion, x]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) onSwipe("like");
    else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) onSwipe("pass");
    else animate(dragX, 0, { type: "spring", stiffness: 400, damping: 30 });
  }

  // The exit direction is passed via <AnimatePresence custom>, because a card
  // that is being removed no longer receives new props.
  const variants = {
    exit: (direction: SwipeAction) => {
      const sign = direction === "like" ? 1 : -1;
      return reducedMotion
        ? { opacity: 0, transition: { duration: 0.15 } }
        : { x: sign * 520, rotate: sign * 22, opacity: 0, transition: { duration: 0.28, ease: "easeIn" as const } };
    },
  };

  return (
    <motion.article
      aria-label={`${profile.name}, ${profile.age}`}
      aria-hidden={!isTop}
      className="absolute inset-0 flex select-none flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-card"
      style={{ x, rotate, zIndex: 10 - depth, touchAction: "pan-y" }}
      initial={false}
      animate={{
        scale: 1 - depth * 0.04,
        y: depth * 14,
        opacity: depth > 1 ? 0 : 1,
      }}
      variants={variants}
      exit="exit"
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDrag={(_, info) => dragX.set(info.offset.x)}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: "grabbing" }}
    >
      <div className="relative min-h-0 flex-1 bg-surface-muted">
        {/* Illustrated placeholder avatar (the assignment allows placeholder photos). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.photoUrl}
          alt={`Illustrated avatar of ${profile.name}`}
          draggable={false}
          className="h-full w-full object-cover object-[center_25%]"
        />

        {isTop && (
          <>
            <motion.span
              aria-hidden
              style={{ opacity: likeOpacity }}
              className="absolute top-6 left-5 -rotate-12 rounded-xl border-4 border-primary bg-surface/80 px-3 py-1 text-2xl font-extrabold tracking-wider text-primary"
            >
              LIKE
            </motion.span>
            <motion.span
              aria-hidden
              style={{ opacity: passOpacity }}
              className="absolute top-6 right-5 rotate-12 rounded-xl border-4 border-pass bg-surface/80 px-3 py-1 text-2xl font-extrabold tracking-wider text-pass"
            >
              PASS
            </motion.span>
          </>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-fg">
            {profile.name}, <span className="font-medium">{profile.age}</span>
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <GraduationCap size={16} aria-hidden /> {profile.college}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={16} aria-hidden /> {profile.city}
            </span>
          </p>
        </div>
        <p className="line-clamp-2 text-[15px] leading-relaxed text-fg">{profile.bio}</p>
        <ul className="flex flex-wrap gap-2" aria-label="Interests">
          {profile.interests.map((interest) => (
            <li key={interest} className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              {interest}
            </li>
          ))}
        </ul>
      </div>
    </motion.article>
  );
}
