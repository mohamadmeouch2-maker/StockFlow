import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useCart } from "../cart/useCart";
import { LogoMark } from "./Logo";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "font-semibold text-blue-600" : "text-gray-600 hover:text-gray-900";

// The frame around every page: a nav bar on top, the current page below.
// The links depend on who is logged in (guide 4.6).
export function Layout() {
  const { user, logout } = useAuth();
  const { count, clear } = useCart();
  const navigate = useNavigate();

  const onLogout = () => {
    clear(); // the next person on this browser starts with an empty cart
    logout();
    navigate("/products");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
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
                Cart ({count})
              </NavLink>
              <NavLink to="/orders" className={linkClass}>
                My orders
              </NavLink>
            </>
          )}
          {user?.role === "ADMIN" && (
            <>
              <NavLink to="/admin/products" className={linkClass}>
                Manage products
              </NavLink>
              <NavLink to="/admin/orders" className={linkClass}>
                Manage orders
              </NavLink>
              <NavLink to="/admin/low-stock" className={linkClass}>
                Low stock
              </NavLink>
            </>
          )}

          <div className="ml-auto flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-500">
                  {user.name} ({user.role.toLowerCase()})
                </span>
                <button onClick={onLogout} className="text-gray-600 hover:text-gray-900">
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass}>
                  Log in
                </NavLink>
                <NavLink to="/register" className={linkClass}>
                  Register
                </NavLink>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
