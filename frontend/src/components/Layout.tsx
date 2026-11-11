import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { issuesApi } from "../api/issues";
import { useAuth } from "../auth/useAuth";
import { useCart } from "../cart/useCart";
import { useToast } from "../toast/useToast";
import { LogoMark } from "./Logo";
import { NotificationBell } from "./NotificationBell";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

// The frame around every page: a nav bar on top, the current page, and a footer.
// The links depend on who is logged in (guide 4.6).
export function Layout() {
  const { user, logout } = useAuth();
  const { count, clear } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const toast = useToast();
  // Admins see how many problem reports are still open (checked again every minute).
  const issues = useQuery({
    queryKey: ["issues", "OPEN"],
    queryFn: () => issuesApi.all("OPEN"),
    enabled: user?.role === "ADMIN",
    refetchInterval: 60_000,
  });
  const openIssues = issues.data?.length ?? 0;

  const onLogout = () => {
    clear(); // the next person on this browser starts with an empty cart
    logout();
    navigate("/products");
    toast("You are logged out. See you soon!", "info");
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Stays at the top while scrolling */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-2 px-6 py-3">
          <Link to="/" className="mr-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <LogoMark className="h-8 w-8" />
            <span>
              Stock<span className="text-blue-600">Flow</span>
            </span>
          </Link>
          <NavLink to="/products" end className={linkClass}>
            Products
          </NavLink>

          {user?.role === "CUSTOMER" && (
            <>
              <NavLink to="/cart" className={linkClass}>
                Cart
                {count > 0 && <span className="ml-1.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-xs text-white">{count}</span>}
              </NavLink>
              <NavLink to="/orders" className={linkClass}>
                My orders
              </NavLink>
            </>
          )}
          {user?.role === "ADMIN" && (
            <>
              <NavLink to="/admin" end className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/admin/products" className={linkClass}>
                Manage products
              </NavLink>
              <NavLink to="/admin/orders" className={linkClass}>
                Manage orders
              </NavLink>
              <NavLink to="/admin/low-stock" className={linkClass}>
                Low stock
              </NavLink>
              <NavLink to="/admin/support" className={linkClass}>
                Support
                {openIssues > 0 && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">{openIssues}</span>}
              </NavLink>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            {user?.role === "ADMIN" && <NotificationBell />}
            {user ? (
              <>
                <span className="hidden items-center gap-2 text-sm text-slate-600 sm:flex">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  {user.name}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{user.role.toLowerCase()}</span>
                </span>
                <button onClick={onLogout} className="btn btn-outline py-1.5">
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass}>
                  Log in
                </NavLink>
                <Link to="/register" className="btn btn-primary py-1.5">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* key: every new page fades in (see .page-fade in index.css) */}
        <div key={pathname} className="page-fade">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <LogoMark className="h-6 w-6" />
            <span>
              <strong className="text-slate-700">StockFlow</strong>: inventory and orders, made simple
            </span>
          </div>
          <div className="flex gap-4">
            <Link to="/products" className="hover:text-slate-800">
              Products
            </Link>
            <a href="https://github.com/mohamadmeouch2-maker/StockFlow" className="hover:text-slate-800">
              GitHub
            </a>
          </div>
          <p>© {new Date().getFullYear()} StockFlow · Training project</p>
        </div>
      </footer>
    </div>
  );
}
