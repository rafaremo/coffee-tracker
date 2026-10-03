import { auth } from "./auth.server";
import type { AuthSession } from "./auth.server";

export async function getSession(request: Request): Promise<AuthSession | null> {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  try {
    const session = await auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    return session as AuthSession | null;
  } catch {
    return null;
  }
}

export async function requireAuth(request: Request): Promise<AuthSession> {
  const session = await getSession(request);
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}
