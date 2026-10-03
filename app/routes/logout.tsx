import { auth } from "~/lib/auth.server";
import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const result = await auth.api.signOut({ headers: request.headers, asResponse: true });
  const headers = new Headers();
  for (const cookie of result.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
  return redirect("/login", { headers });
}

export async function loader() {
  return redirect("/login");
}
