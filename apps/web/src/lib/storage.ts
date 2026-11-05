import path from "node:path";

/**
 * Directorul imaginilor încărcate. În producție, cu mai multe servere, se înlocuiește cu o stocare
 * de obiecte (S3 / MinIO), păstrând aceleași adrese /api/uploads/….
 */
export function uploadDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./storage/uploads");
}

export function uploadPath(fileName: string): string {
  return path.join(/*turbopackIgnore: true*/ uploadDir(), fileName);
}
