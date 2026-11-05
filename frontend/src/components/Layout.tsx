import { Link, NavLink, Outlet } from "react-router-dom";

// The frame around every page: a nav bar on top, the current page below.
// Login/Logout and role-based links come later, when we add authentication.
export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link to="/" className="text-lg font-bold text-blue-600">
            StockFlow
          </Link>
          <NavLink
            to="/products"
            className={({ isActive }) => (isActive ? "font-semibold text-blue-600" : "text-gray-600 hover:text-gray-900")}
          >
            Products
          </NavLink>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
