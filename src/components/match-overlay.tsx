"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Heart } from "@phosphor-icons/react";
import { photoUrl, type Match } from "@/lib/discover";

type Props = { match: Match; reducedMotion: boolean; onClose: () => void };

export function MatchOverlay({ match, reducedMotion, onClose }: Props) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pop = (delay: number, from: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, x: from, scale: 0.6 },
          animate: { opacity: 1, x: 0, scale: 1 },
          transition: { type: "spring" as const, stiffness: 260, damping: 18, delay },
        };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-title"
      aria-describedby="match-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#e11d48] to-[#9f1239] p-6 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative mb-8 flex items-center">
          <motion.div {...pop(0.05, -40)} className="relative z-0 -mr-4 size-28 overflow-hidden rounded-full border-4 border-white bg-[#ffe4e6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl("coy-you")} alt="You" className="h-full w-full object-cover" />
          </motion.div>
          <motion.div {...pop(0.12, 40)} className="relative z-0 -ml-4 size-28 overflow-hidden rounded-full border-4 border-white bg-[#ffe4e6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={match.photoUrl} alt={match.name} className="h-full w-full object-cover" />
          </motion.div>
          <motion.span
            {...(reducedMotion
              ? {}
              : { initial: { scale: 0 }, animate: { scale: 1 }, transition: { type: "spring" as const, stiffness: 400, damping: 14, delay: 0.3 } })}
            className="absolute left-1/2 top-1/2 z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#e11d48] shadow-lg"
            aria-hidden
          >
            <Heart size={26} weight="fill" />
          </motion.span>
        </div>

        <motion.h2
          id="match-title"
          className="text-4xl font-extrabold tracking-tight"
          {...(reducedMotion ? {} : { initial: { y: 12, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { delay: 0.2 } })}
        >
          It&rsquo;s a match!
        </motion.h2>
        <p id="match-desc" className="mt-3 text-base text-white/90">
          You and {match.name} liked each other. Neither of you had to go first.
        </p>

        <div className="mt-10 flex w-full flex-col gap-3">
          <button
            ref={primaryRef}
            type="button"
            onClick={onClose}
            className="h-12 cursor-pointer rounded-full bg-white font-semibold text-[#be123c] transition-transform duration-150 active:scale-[0.97]"
          >
            Keep swiping
          </button>
          <Link
            href="/discover/matches"
            className="grid h-12 place-items-center rounded-full border-2 border-white/70 font-semibold text-white transition-colors duration-150 hover:bg-white/10"
          >
            See all matches
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
