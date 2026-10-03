import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const file = formData.get("photo") as File | null;

  if (!file || file.size === 0) {
    return json({ error: "No file uploaded" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name) || ".jpg";
  const filename = `coffee_${Date.now()}${ext}`;
  const filepath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return json({ photoPath: `/uploads/${filename}` });
}
