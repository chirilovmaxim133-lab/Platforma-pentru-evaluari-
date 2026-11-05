import Link from "next/link";
import { SITE } from "@/config/site";
import { Ornament } from "./Ornament";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label={SITE.name}>
      <span className="grid size-9 place-items-center rounded-xl bg-ink transition-transform duration-300 group-hover:rotate-45">
        <Ornament motif="small" className="size-6" />
      </span>
      <span className="font-display text-xl font-bold tracking-tight">{SITE.name}</span>
    </Link>
  );
}
