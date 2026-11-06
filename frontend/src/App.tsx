import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { CartProvider } from "./cart/CartProvider";
import { HomeHero } from "./components/HomeHero";
import { Layout } from "./components/Layout";
import { SplashScreen } from "./components/SplashScreen";
import { AdminOrdersPage } from "./pages/admin/AdminOrdersPage";
import { AdminProductsPage } from "./pages/admin/AdminProductsPage";
import { LowStockPage } from "./pages/admin/LowStockPage";
import { SupportPage } from "./pages/admin/SupportPage";
import { ProductFormPage } from "./pages/admin/ProductFormPage";
import { CartPage } from "./pages/CartPage";
import { LoginPage } from "./pages/LoginPage";
import { MyOrdersPage } from "./pages/MyOrdersPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { ProductsPage } from "./pages/ProductsPage";
import { RegisterPage } from "./pages/RegisterPage";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

// The guide's routes (4.6). The dashboard is not built (the .NET reporting part is out of scope).
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SplashScreen />
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/products" replace />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
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
                <Route element={<ProtectedRoute role="CUSTOMER" />}>
                  <Route path="cart" element={<CartPage />} />
                  <Route path="orders" element={<MyOrdersPage />} />
                </Route>
                <Route path="admin" element={<ProtectedRoute role="ADMIN" />}>
                  <Route index element={<Navigate to="/admin/products" replace />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="products/new" element={<ProductFormPage />} />
                  <Route path="products/:id/edit" element={<ProductFormPage />} />
                  <Route path="orders" element={<AdminOrdersPage />} />
                  <Route path="low-stock" element={<LowStockPage />} />
                  <Route path="support" element={<SupportPage />} />
                </Route>
                <Route path="*" element={<p className="p-6">Page not found</p>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
