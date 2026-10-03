import { Outlet, useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import Navbar from "~/components/Navbar";
import { getSession } from "~/lib/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  return json({ user: session?.user ?? null });
}

export default function Layout() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <>
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <footer className="bg-coffee-900 text-coffee-400 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          Coffee Tracker ☕ Built for specialty coffee lovers
        </div>
      </footer>
    </>
  );
}
