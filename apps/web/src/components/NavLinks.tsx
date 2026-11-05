"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  // Cea mai lungă potrivire câștigă: /profesor/clase nu activează și „Teste”.
  const active = [...links].sort((a, b) => b.href.length - a.href.length).find((l) => path === l.href || path.startsWith(`${l.href}/`));
  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-bold transition-colors",
            active?.href === l.href ? "bg-red-soft text-red" : "text-ink-2 hover:bg-ink/5 hover:text-ink",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
