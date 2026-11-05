import { readFile } from "node:fs/promises";
import { uploadPath } from "@/lib/storage";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

/** Imaginile din teste. Numele sunt UUID-uri (imposibil de ghicit). */
export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/[id]">) {
  const { id } = await ctx.params;
  const m = /^([0-9a-f-]{36})\.(png|jpg|webp|gif)$/.exec(id);
  if (!m) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(uploadPath(`${m[1]}.${m[2]}`));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[m[2]],
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
