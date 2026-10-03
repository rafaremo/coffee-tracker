import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Search, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { getAllCoffees } from "~/lib/coffee.server";
import CoffeeCard from "~/components/CoffeeCard";
import { requireAuth } from "~/lib/session.server";

export const meta: MetaFunction = () => [
  { title: "My Coffees - Coffee Tracker" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireAuth(request);
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const favoriteOnly = url.searchParams.get("favorite_only") === "true";
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);

  const result = await getAllCoffees({ search, favoriteOnly, userId: session.user.id, skip, limit });
  return json({ ...result, skip, limit, search, favoriteOnly });
}

export default function CoffeeList() {
  const { items, total, skip, limit, search, favoriteOnly } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-coffee-900 font-display">My Coffees</h1>
          <p className="text-coffee-500 mt-1">{total} coffee{total !== 1 ? "s" : ""} tracked</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <form method="get" className="flex items-center gap-2 flex-1 sm:flex-none">
            <input
              type="text"
              name="search"
              defaultValue={search || ""}
              placeholder="Search coffees..."
              className="form-input w-full sm:w-64"
            />
            {favoriteOnly && <input type="hidden" name="favorite_only" value="true" />}
            <button type="submit" className="btn-secondary">
              <Search className="w-4 h-4" />
            </button>
          </form>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (search) params.set("search", search);
              if (!favoriteOnly) params.set("favorite_only", "true");
              setSearchParams(params);
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              favoriteOnly
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-white text-coffee-600 border border-coffee-300 hover:bg-coffee-50"
            }`}
          >
            <Heart className="w-4 h-4" />
            Favorites
          </button>
        </div>
      </div>

      {items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((coffee) => (
              <CoffeeCard key={coffee.id} coffee={coffee} />
            ))}
          </div>

          {total > limit && (
            <div className="mt-8 flex items-center justify-center gap-4">
              {skip > 0 && (
                <Link
                  to={`/coffees?skip=${Math.max(0, skip - limit)}&limit=${limit}${search ? `&search=${search}` : ""}${favoriteOnly ? "&favorite_only=true" : ""}`}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-coffee-300 rounded-lg hover:bg-coffee-50 transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Link>
              )}
              <span className="text-coffee-500 text-sm">
                {skip + 1} - {Math.min(skip + limit, total)} of {total}
              </span>
              {skip + limit < total && (
                <Link
                  to={`/coffees?skip=${skip + limit}&limit=${limit}${search ? `&search=${search}` : ""}${favoriteOnly ? "&favorite_only=true" : ""}`}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-coffee-300 rounded-lg hover:bg-coffee-50 transition"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <CoffeeCardPlaceholder />
          <h3 className="text-xl font-semibold text-coffee-600 mt-4 mb-2">No coffees yet</h3>
          <p className="text-coffee-400 mb-6">Start tracking your specialty coffee journey</p>
          <Link to="/coffees/new" className="btn-primary">
            Add Your First Coffee
          </Link>
        </div>
      )}
    </div>
  );
}

function CoffeeCardPlaceholder() {
  return (
    <div className="w-20 h-20 bg-coffee-100 rounded-full flex items-center justify-center mx-auto">
      <svg className="w-10 h-10 text-coffee-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    </div>
  );
}
