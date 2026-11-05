import Link from "next/link";
import { SITE } from "@/config/site";
import { Ornament } from "./Ornament";

export function Logo({ href = "/", tone = "light" }: { href?: string; tone?: "light" | "dark" }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label={SITE.name}>
      <span className="grid size-9 place-items-center rounded-xl bg-night ring-1 ring-night-ink/10 transition-transform duration-500 group-hover:rotate-45">
        <Ornament motif="small" tone="dark" className="size-6" />
      </span>
      <span className={`font-display text-xl font-bold tracking-tight ${tone === "dark" ? "text-night-ink" : ""}`}>{SITE.name}</span>
    </Link>
  );
}
