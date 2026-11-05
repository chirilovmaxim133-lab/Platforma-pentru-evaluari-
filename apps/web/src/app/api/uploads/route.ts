import { mkdir, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploads } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { uploadDir, uploadPath } from "@/lib/storage";

const MAX_BYTES = 5 * 1024 * 1024;


/** Recunoaștem formatul după primii octeți, nu după numele fișierului (fără SVG/HTML — risc de XSS). */
function sniff(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (buf.subarray(0, 6).toString("ascii") === "GIF87a" || buf.subarray(0, 6).toString("ascii") === "GIF89a") return { mime: "image/gif", ext: "gif" };
  return null;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!rateLimit(`upload:${user.id}`, 60, 60_000)) return NextResponse.json({ error: "rate" }, { status: 429 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) return NextResponse.json({ error: "type" }, { status: 400 });

  const [row] = await db
    .insert(uploads)
    .values({ ownerId: user.id, fileName: "", mime: kind.mime, size: buf.length })
    .returning({ id: uploads.id });
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(uploadPath(`${row.id}.${kind.ext}`), buf);
  return NextResponse.json({ url: `/api/uploads/${row.id}.${kind.ext}` });
}
