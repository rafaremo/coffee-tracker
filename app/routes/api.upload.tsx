import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "node:crypto";
import { requireAuth } from "~/lib/session.server";

export async function action({ request }: ActionFunctionArgs) {
  await requireAuth(request);
  const formData = await request.formData();
  const file = formData.get("photo");

  if (!file || typeof file === "string" || file.size === 0) {
    return json({ error: "No file uploaded" }, { status: 400 });
  }

  const extensions: Record<string, string> = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
  };
  const ext = extensions[file.type];
  if (!ext || file.size > 5 * 1024 * 1024) {
    return json({ error: "Upload a JPEG, PNG, WebP, or GIF up to 5 MB" }, { status: 400 });
  }
  const uploadDir = process.env.UPLOAD_DIR || (process.env.NODE_ENV === "production"
    ? "/app/data/uploads" : path.join(process.cwd(), "public", "uploads"));
  await mkdir(uploadDir, { recursive: true });

  const filename = `coffee_${randomUUID()}${ext}`;
  const filepath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return json({ photoPath: `/uploads/${filename}` });
}
