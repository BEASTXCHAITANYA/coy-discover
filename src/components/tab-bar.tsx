"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CardsThree, House } from "@phosphor-icons/react";

const TABS = [
  { href: "/home", label: "Home", Icon: House },
  { href: "/discover", label: "Discover", Icon: CardsThree },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-2">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-200 ${
                  active ? "text-primary" : "text-fg-muted hover:text-fg"
                }`}
              >
                <Icon size={24} weight={active ? "fill" : "regular"} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
