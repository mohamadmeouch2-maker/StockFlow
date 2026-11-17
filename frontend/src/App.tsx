import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { CartProvider } from "./cart/CartProvider";
import { HomeHero } from "./components/HomeHero";
import { Layout } from "./components/Layout";
import { DashboardSkeleton } from "./components/Skeleton";
import { SplashScreen } from "./components/SplashScreen";
import { CartPage } from "./pages/CartPage";
import { LoginPage } from "./pages/LoginPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { ProductsPage } from "./pages/ProductsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { CurrencyProvider } from "./currency/CurrencyProvider";
import { I18nProvider } from "./i18n/I18nProvider";
import { useT } from "./i18n/useT";
import { ToastProvider } from "./toast/ToastProvider";

// The admin pages (and the dashboard's chart library) are downloaded only when an admin
// opens them, so customers get a smaller, faster website. (Layout shows grey boxes meanwhile.)
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProductsPage").then((m) => ({ default: m.AdminProductsPage })));
const ProductFormPage = lazy(() => import("./pages/admin/ProductFormPage").then((m) => ({ default: m.ProductFormPage })));
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage").then((m) => ({ default: m.AdminOrdersPage })));
const LowStockPage = lazy(() => import("./pages/admin/LowStockPage").then((m) => ({ default: m.LowStockPage })));
const SupportPage = lazy(() => import("./pages/admin/SupportPage").then((m) => ({ default: m.SupportPage })));
const CategoriesPage = lazy(() => import("./pages/admin/CategoriesPage").then((m) => ({ default: m.CategoriesPage })));

// "Forgot password?" and Customer service are not needed on every visit, so they are downloaded only when opened too.
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const CustomerServicePage = lazy(() => import("./pages/CustomerServicePage").then((m) => ({ default: m.CustomerServicePage })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));

// The pages behind a customer login are downloaded when first opened too, so the first visit is lighter.
const AccountPage = lazy(() => import("./pages/AccountPage").then((m) => ({ default: m.AccountPage })));
const MyOrdersPage = lazy(() => import("./pages/MyOrdersPage").then((m) => ({ default: m.MyOrdersPage })));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage").then((m) => ({ default: m.FavoritesPage })));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

// The guide's routes (4.6). The admin dashboard reads its numbers from the Core API
// (the guide's .NET reporting API is out of scope).
export default function App() {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <CurrencyProvider>
          <SplashScreen />
          <ToastProvider>
            <AuthProvider>
              <CartProvider>
                <BrowserRouter>
                  <Routes>
                    <Route element={<Layout />}>
                      <Route index element={<Navigate to="/products" replace />} />
                      <Route path="login" element={<LoginPage />} />
                      <Route path="register" element={<RegisterPage />} />
                      <Route path="verify-email" element={<VerifyEmailPage />} />
                      <Route path="forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="reset-password" element={<ResetPasswordPage />} />
                      <Route path="help" element={<CustomerServicePage />} />
                      <Route
                        path="products"
                        element={
                          <>
                            <HomeHero />
                            <ProductsPage />
                          </>
                        }
                      />
                      <Route path="products/:id" element={<ProductDetailPage />} />
                      <Route element={<ProtectedRoute />}>
                        <Route path="account" element={<AccountPage />} />
                      </Route>
                      <Route element={<ProtectedRoute role="CUSTOMER" />}>
                        <Route path="cart" element={<CartPage />} />
                        <Route path="orders" element={<MyOrdersPage />} />
                        <Route path="favorites" element={<FavoritesPage />} />
                      </Route>
                      <Route path="admin" element={<ProtectedRoute role="ADMIN" />}>
                        <Route
                          index
                          element={
                            <Suspense fallback={<DashboardSkeleton />}>
                              <DashboardPage />
                            </Suspense>
                          }
                        />
                        <Route path="products" element={<AdminProductsPage />} />
                        <Route path="products/new" element={<ProductFormPage />} />
                        <Route path="products/:id/edit" element={<ProductFormPage />} />
                        <Route path="orders" element={<AdminOrdersPage />} />
                        <Route path="low-stock" element={<LowStockPage />} />
                        <Route path="support" element={<SupportPage />} />
                        <Route path="categories" element={<CategoriesPage />} />
                      </Route>
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                </BrowserRouter>
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </CurrencyProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}

function NotFound() {
  const { t } = useT();
  return <p className="p-6">{t("Page not found")}</p>;
}
