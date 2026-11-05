import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { ProductsPage } from "./pages/ProductsPage";

// Day 4 version of the guide's routes (4.6): only the product pages for now.
// The other pages, login and the cart are added on later days.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/products" replace />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="*" element={<p className="p-6">Page not found</p>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
