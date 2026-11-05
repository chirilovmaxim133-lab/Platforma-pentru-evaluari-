import katex from "katex";
import { cn } from "./ui";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Text cu formule: $…$ în rând, $$…$$ pe linie separată. Restul textului este afișat ca text simplu. */
export function renderMath(text: string): string {
  const ESC = "\u0000";
  const src = text.replace(/\\\$/g, ESC);
  const parts = src.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
  return parts
    .map((part) => {
      const display = part.startsWith("$$") && part.endsWith("$$") && part.length > 4;
      const inline = !display && part.startsWith("$") && part.endsWith("$") && part.length > 2;
      if (display || inline) {
        const tex = part.slice(display ? 2 : 1, display ? -2 : -1).replaceAll(ESC, "\\$");
        return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", output: "html" });
      }
      return escapeHtml(part.replaceAll(ESC, "$"));
    })
    .join("");
}

export function MathText({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn("whitespace-pre-wrap break-words", className)}
      dangerouslySetInnerHTML={{ __html: renderMath(text) }}
    />
  );
}
