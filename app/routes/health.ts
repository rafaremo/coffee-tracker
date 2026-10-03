import { json } from "@remix-run/node";
import { prisma } from "~/lib/db.server";

export async function loader() {
  try {
    await prisma.coffeeEntry.count();
    await prisma.user.count();
    return json({ status: "ok" });
  } catch {
    return json({ status: "unavailable" }, { status: 503 });
  }
}
