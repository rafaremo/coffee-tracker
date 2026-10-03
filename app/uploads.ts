import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// Limit the complete multipart request before parsing; do not trust Content-Length.
export async function boundedForm(request: Request, limit = 6 * 1024 * 1024) {
  const reader = request.body?.getReader();
  if (!reader) return new FormData();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new Response("Upload is too large", { status: 413 });
    }
    chunks.push(value);
  }
  return new Request(request.url, {
    method: "POST",
    headers: { "content-type": request.headers.get("content-type") || "" },
    body: Buffer.concat(chunks),
  }).formData();
}
export async function savePhoto(
  file: FormDataEntryValue | null,
  dataDir: string,
) {
  if (!file || typeof file === "string" || !file.size) return undefined;
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Photos must be 5 MB or smaller");
  const data = Buffer.from(await file.arrayBuffer());
  const hex = data.subarray(0, 12).toString("hex");
  const ext = hex.startsWith("ffd8ff")
    ? "jpg"
    : hex.startsWith("89504e470d0a1a0a")
      ? "png"
      : data
            .subarray(0, 6)
            .toString()
            .match(/^GIF8[79]a$/)
        ? "gif"
        : data.subarray(0, 4).toString() === "RIFF" &&
            data.subarray(8, 12).toString() === "WEBP"
          ? "webp"
          : undefined;
  if (!ext) throw new Error("Choose a JPEG, PNG, WebP, or GIF image");
  await mkdir(join(dataDir, "uploads"), { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(join(dataDir, "uploads", name), data, { mode: 0o600 });
  return `/uploads/${name}`;
}
export async function photoResponse(filename: string, dataDir: string) {
  if (!/^[a-f0-9-]+\.(jpg|png|webp|gif)$/.test(filename))
    return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(join(dataDir, "uploads", filename));
    const ext = filename.split(".").pop();
    return new Response(data, {
      headers: {
        "content-type": `image/${ext === "jpg" ? "jpeg" : ext}`,
        "cache-control": "private, max-age=86400",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
