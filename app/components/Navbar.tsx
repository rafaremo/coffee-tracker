import { Link, useLocation, Form } from "@remix-run/react";
import { Coffee, LayoutDashboard, List, Plus, LogOut, User } from "lucide-react";

interface Props {
  user?: { id: string; name: string | null; email: string } | null;
}

export default function Navbar({ user }: Props) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-coffee-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <Coffee className="w-6 h-6 text-latte-400" />
            <span className="font-display font-bold text-xl tracking-tight">Coffee Tracker</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            {user ? (
              <>
                <Link
                  to="/"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive("/") ? "bg-coffee-800 text-latte-300" : "text-coffee-300 hover:text-white hover:bg-coffee-800"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <Link
                  to="/coffees"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    location.pathname.startsWith("/coffees") && location.pathname !== "/coffees/new"
                      ? "bg-coffee-800 text-latte-300"
                      : "text-coffee-300 hover:text-white hover:bg-coffee-800"
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">My Coffees</span>
                </Link>
                <Link
                  to="/coffees/new"
                  className="flex items-center gap-1.5 bg-espresso-600 hover:bg-espresso-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Coffee</span>
                </Link>
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-coffee-700">
                  <User className="w-4 h-4 text-coffee-400" />
                  <span className="text-sm text-coffee-300 hidden md:inline">{user.name || user.email}</span>
                  <Form method="post" action="/logout" className="inline">
                    <button type="submit" className="text-coffee-400 hover:text-white transition p-1.5 rounded-lg hover:bg-coffee-800">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </Form>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-coffee-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition hover:bg-coffee-800">
                  Sign In
                </Link>
                <Link to="/register" className="bg-espresso-600 hover:bg-espresso-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
