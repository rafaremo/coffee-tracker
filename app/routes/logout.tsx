import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    "better-auth.session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  return redirect("/login", { headers });
}

export async function loader() {
  return redirect("/login");
}
