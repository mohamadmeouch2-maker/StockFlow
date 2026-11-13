import { useQuery } from "@tanstack/react-query";
import { Suspense, useCallback, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { favoritesApi } from "../api/favorites";
import { issuesApi } from "../api/issues";
import { useAuth } from "../auth/useAuth";
import { useCart } from "../cart/useCart";
import { useToast } from "../toast/useToast";
import { ChristmasSalePopup } from "./ChristmasSalePopup";
import { LogoMark } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { SideMenu } from "./SideMenu";
import { RowsSkeleton } from "./Skeleton";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`;
// The links in the ☰ menu: one per row, the count on the right
const menuLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"}`;

// The frame around every page: a bar on top (☰ menu, logo, account), the current page, and a footer.
// The page links are in the ☰ menu that slides in from the left. They depend on who is logged in (guide 4.6).
export function Layout() {
  const { user, logout } = useAuth();
  const { count, clear } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const toast = useToast();
  // The ☰ menu is open on the page where it was opened: going to another page closes it by itself.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;
  const closeMenu = useCallback(() => setMenuOpenOn(null), []);
  // Admins see how many problem reports are still open (checked again every minute).
  const issues = useQuery({
    queryKey: ["issues", "OPEN"],
    queryFn: () => issuesApi.all("OPEN"),
    enabled: user?.role === "ADMIN",
    refetchInterval: 60_000,
  });
  const openIssues = issues.data?.length ?? 0;
  // Customers see how many products they saved (the same list the hearts use)
  const favorites = useQuery({ queryKey: ["favorites"], queryFn: favoritesApi.list, enabled: user?.role === "CUSTOMER" });
  const favoriteCount = favorites.data?.length ?? 0;
  // A number on the ☰ button, so it is not hidden in the menu: items in the cart (customers), open problem reports (admins)
  const badge = user?.role === "ADMIN" ? openIssues : user?.role === "CUSTOMER" ? count : 0;
  const badgeText = user?.role === "ADMIN" ? `${badge} open problem report${badge === 1 ? "" : "s"}` : `${badge} item${badge === 1 ? "" : "s"} in the cart`;

  const onLogout = () => {
    clear(); // the next person on this browser starts with an empty cart
    logout();
    navigate("/products");
    toast("You are logged out. See you soon!", "info");
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Stays at the top while scrolling. `inert` while the menu is open: Tab stays inside the menu. */}
      <nav aria-label="Top" inert={menuOpen} className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-2 px-6 py-3">
          <button
            type="button"
            onClick={() => setMenuOpenOn(pathname)}
            aria-label={badge > 0 ? `Menu, ${badgeText}` : "Menu"}
            aria-expanded={menuOpen}
            aria-controls="side-menu"
            className="relative -ml-2 rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {badge > 0 && (
              <span aria-hidden="true" className={`count absolute -top-1 -right-1 ml-0 ${user?.role === "ADMIN" ? "count-alert" : "count-brand"}`}>
                {badge}
              </span>
            )}
          </button>
          <Link to="/" className="mr-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <LogoMark className="h-8 w-8" />
            <span>
              Stock<span className="text-brand-600">Flow</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {user?.role === "ADMIN" && <NotificationBell />}
            {user ? (
              <>
                {/* The avatar and name open My account (name, address, password) */}
                <NavLink
                  to="/account"
                  title="My account"
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 text-sm transition ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`
                  }
                >
                  <span className="sr-only">My account: </span>
                  <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline">{user.name}</span>
                  <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 sm:inline">{user.role.toLowerCase()}</span>
                </NavLink>
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

      <SideMenu open={menuOpen} onClose={closeMenu}>
        <NavLink to="/products" end className={menuLinkClass}>
          Products
        </NavLink>
        {user?.role === "CUSTOMER" && (
          <>
            <NavLink to="/cart" className={menuLinkClass}>
              Cart
              {count > 0 && <span className="count count-brand ml-auto">{count}</span>}
            </NavLink>
            <NavLink to="/favorites" className={menuLinkClass}>
              Favourites
              {favoriteCount > 0 && <span className="count count-brand ml-auto">{favoriteCount}</span>}
            </NavLink>
            <NavLink to="/orders" className={menuLinkClass}>
              My orders
            </NavLink>
          </>
        )}
        {user?.role === "ADMIN" && (
          <>
            <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">Admin</p>
            <NavLink to="/admin" end className={menuLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/admin/products" className={menuLinkClass}>
              Manage products
            </NavLink>
            <NavLink to="/admin/categories" className={menuLinkClass}>
              Categories
            </NavLink>
            <NavLink to="/admin/orders" className={menuLinkClass}>
              Manage orders
            </NavLink>
            <NavLink to="/admin/low-stock" className={menuLinkClass}>
              Low stock
            </NavLink>
            <NavLink to="/admin/support" className={menuLinkClass}>
              Support
              {openIssues > 0 && <span className="count count-alert ml-auto">{openIssues}</span>}
            </NavLink>
          </>
        )}
        <hr className="my-3 border-slate-200" />
        {user ? (
          <NavLink to="/account" className={menuLinkClass}>
            My account
          </NavLink>
        ) : (
          <>
            <NavLink to="/login" className={menuLinkClass}>
              Log in
            </NavLink>
            <NavLink to="/register" className={menuLinkClass}>
              Register
            </NavLink>
          </>
        )}
      </SideMenu>

      <main inert={menuOpen} className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* key: every new page fades in (see .page-fade in index.css) */}
        <div key={pathname} className="page-fade">
          {/* Pages that are downloaded on demand (the admin pages) show grey boxes while they load */}
          <Suspense fallback={<RowsSkeleton rows={4} />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <ChristmasSalePopup />

      <footer inert={menuOpen} className="border-t border-slate-200 bg-white">
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
