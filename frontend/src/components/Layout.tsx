import { useQuery } from "@tanstack/react-query";
import { Suspense, useCallback, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { favoritesApi } from "../api/favorites";
import { supportApi } from "../api/support";
import { useAuth } from "../auth/useAuth";
import { useCart } from "../cart/useCart";
import { useToast } from "../toast/useToast";
import { ChristmasSalePopup } from "./ChristmasSalePopup";
import { LogoMark } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { SideMenu } from "./SideMenu";
import { RowsSkeleton } from "./Skeleton";
import { useT } from "../i18n/useT";
import { CurrencySelect } from "./CurrencySelect";
import { LanguageSelect } from "./LanguageSelect";

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
  const { t } = useT();
  // The ☰ menu is open on the page where it was opened: going to another page closes it by itself.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;
  const closeMenu = useCallback(() => setMenuOpenOn(null), []);
  // Customer service, checked again every minute. Admins: how many messages wait for an answer.
  // Customers: how many conversations have a new answer they haven't seen.
  const waiting = useQuery({ queryKey: ["support", "OPEN"], queryFn: () => supportApi.all("OPEN"), enabled: user?.role === "ADMIN", refetchInterval: 60_000 });
  const waitingCount = waiting.data?.length ?? 0;
  const mySupport = useQuery({ queryKey: ["support", "mine"], queryFn: supportApi.mine, enabled: user?.role === "CUSTOMER", refetchInterval: 60_000 });
  const newReplies = mySupport.data?.filter((t) => t.customerUnread).length ?? 0;
  // Customers see how many products they saved (the same list the hearts use)
  const favorites = useQuery({ queryKey: ["favorites"], queryFn: favoritesApi.list, enabled: user?.role === "CUSTOMER" });
  const favoriteCount = favorites.data?.length ?? 0;
  // A red number on the ☰ button, so it is not hidden in the menu: messages waiting for an answer (admins),
  // new answers from customer service (customers). The cart has its own icon in the top bar.
  const badge =
    user?.role === "ADMIN"
      ? { n: waitingCount, text: t("{count} messages waiting for an answer", { count: waitingCount }) }
      : { n: newReplies, text: t("{count} new replies from customer service", { count: newReplies }) };

  const onLogout = () => {
    clear(); // the next person on this browser starts with an empty cart
    logout();
    navigate("/products");
    toast(t("You are logged out. See you soon!"), "info");
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Stays at the top while scrolling. `inert` while the menu is open: Tab stays inside the menu. */}
      <nav aria-label={t("Top")} inert={menuOpen} className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-2 px-6 py-3">
          <button
            type="button"
            onClick={() => setMenuOpenOn(pathname)}
            aria-label={badge.n > 0 ? t("Menu, {details}", { details: badge.text }) : t("Menu")}
            aria-expanded={menuOpen}
            aria-controls="side-menu"
            className="relative -ms-2 rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {badge.n > 0 && (
              <span aria-hidden="true" className="count count-alert absolute -top-1 -end-1 ms-0">
                {badge.n}
              </span>
            )}
          </button>
          <Link to="/" className="me-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <LogoMark className="h-8 w-8" />
            <span>
              Stock<span className="text-brand-600">Flow</span>
            </span>
          </Link>

          <div className="ms-auto flex items-center gap-2">
            <LanguageSelect />
            <CurrencySelect />
            {/* Customers: the cart, with the number of items in it */}
            {user?.role === "CUSTOMER" && (
              <NavLink
                to="/cart"
                aria-label={`${t("Cart")}: ${t("{count} items in the cart", { count })}`}
                title={t("Cart")}
                className={({ isActive }) =>
                  `relative rounded-lg p-2 transition ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="20" r="1.4" />
                  <circle cx="18" cy="20" r="1.4" />
                  <path d="M2.5 3.5h2.3l2.4 11a1.5 1.5 0 0 0 1.5 1.2h8.8a1.5 1.5 0 0 0 1.5-1.1L21 7H5.6" />
                </svg>
                {count > 0 && (
                  <span
                    dir="ltr"
                    aria-hidden="true"
                    className="absolute -top-0.5 -end-0.5 min-w-5 rounded-full bg-brand-600 px-1 text-center text-[11px] leading-5 font-bold text-white"
                  >
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </NavLink>
            )}
            {user && <NotificationBell role={user.role} />}
            {user ? (
              <>
                {/* The avatar and name open My account (name, address, password) */}
                <NavLink
                  to="/account"
                  title={t("My account")}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg py-1 pe-2 ps-1 text-sm transition ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`
                  }
                >
                  <span className="sr-only">{t("My account")}: </span>
                  <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline">{user.name}</span>
                  <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 sm:inline">
                    {user.role === "ADMIN" ? t("admin") : t("customer")}
                  </span>
                </NavLink>
                <button onClick={onLogout} className="btn btn-outline py-1.5">
                  {t("Log out")}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass}>
                  {t("Log in")}
                </NavLink>
                <Link to="/register" className="btn btn-primary py-1.5">
                  {t("Register")}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <SideMenu open={menuOpen} onClose={closeMenu}>
        <NavLink to="/products" end className={menuLinkClass}>
          {t("Products")}
        </NavLink>
        {user?.role === "CUSTOMER" && (
          <>
            <NavLink to="/cart" className={menuLinkClass}>
              {t("Cart")}
              {count > 0 && <span className="count count-brand ms-auto">{count}</span>}
            </NavLink>
            <NavLink to="/favorites" className={menuLinkClass}>
              {t("Favourites")}
              {favoriteCount > 0 && <span className="count count-brand ms-auto">{favoriteCount}</span>}
            </NavLink>
            <NavLink to="/orders" className={menuLinkClass}>
              {t("My orders")}
            </NavLink>
          </>
        )}
        {user?.role !== "ADMIN" && (
          <NavLink to="/help" className={menuLinkClass}>
            {t("Customer service")}
            {newReplies > 0 && <span className="count count-alert ms-auto">{newReplies}</span>}
          </NavLink>
        )}
        {user?.role === "ADMIN" && (
          <>
            <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">{t("Admin")}</p>
            <NavLink to="/admin" end className={menuLinkClass}>
              {t("Dashboard")}
            </NavLink>
            <NavLink to="/admin/products" className={menuLinkClass}>
              {t("Manage products")}
            </NavLink>
            <NavLink to="/admin/categories" className={menuLinkClass}>
              {t("Categories")}
            </NavLink>
            <NavLink to="/admin/orders" className={menuLinkClass}>
              {t("Manage orders")}
            </NavLink>
            <NavLink to="/admin/low-stock" className={menuLinkClass}>
              {t("Low stock")}
            </NavLink>
            <NavLink to="/admin/support" className={menuLinkClass}>
              {t("Customer service")}
              {waitingCount > 0 && <span className="count count-alert ms-auto">{waitingCount}</span>}
            </NavLink>
          </>
        )}
        <hr className="my-3 border-slate-200" />
        {user ? (
          <NavLink to="/account" className={menuLinkClass}>
            {t("My account")}
          </NavLink>
        ) : (
          <>
            <NavLink to="/login" className={menuLinkClass}>
              {t("Log in")}
            </NavLink>
            <NavLink to="/register" className={menuLinkClass}>
              {t("Register")}
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
              <strong className="text-slate-700">StockFlow</strong>: {t("inventory and orders, made simple")}
            </span>
          </div>
          <div className="flex gap-4">
            <Link to="/products" className="hover:text-slate-800">
              {t("Products")}
            </Link>
            <Link to="/help" className="hover:text-slate-800">
              {t("Customer service")}
            </Link>
            <a href="https://github.com/mohamadmeouch2-maker/StockFlow" className="hover:text-slate-800">
              GitHub
            </a>
          </div>
          <p>
            © {new Date().getFullYear()} StockFlow · {t("Training project")}
          </p>
        </div>
      </footer>
    </div>
  );
}
