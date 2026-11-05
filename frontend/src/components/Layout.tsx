import { Link, NavLink, Outlet } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "font-semibold text-blue-600" : "text-gray-600 hover:text-gray-900";

// The frame around every page: a nav bar on top, the current page below.
// Login/Logout and role-based links come on Nov 12. Until then everyone sees "Admin".
export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link to="/" className="text-lg font-bold text-blue-600">
            StockFlow
          </Link>
          <NavLink to="/products" className={linkClass}>
            Products
          </NavLink>
          <NavLink to="/admin/products" className={linkClass}>
            Admin
          </NavLink>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
