import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { productsApi } from "../../api/products";
import type { Product } from "../../api/types";
import { Pagination } from "../../components/Pagination";
import { ProductImage } from "../../components/ProductImage";
import { StockBadge } from "../../components/StockBadge";

// FR-11 (admin): table of all products with Edit and Delete, plus a "New product" button.
export function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const products = useQuery({
    queryKey: ["products", "admin", page],
    queryFn: () => productsApi.list({ page }),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
    },
  });

  const onDelete = (p: Product) => {
    if (confirm(`Delete "${p.name}"?`)) remove.mutate(p.id);
  };

  const totalPages = products.data ? Math.max(1, Math.ceil(products.data.total / products.data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage products</h1>
        <Link to="/admin/products/new" className="rounded bg-blue-600 px-4 py-2 text-white">
          New product
        </Link>
      </div>

      {products.isLoading && <p>Loading...</p>}
      {products.isError && <p className="text-red-600">Could not load products. {products.error.message}</p>}
      {remove.isError && <p className="text-red-600">Could not delete. {remove.error.message}</p>}

      <table className="w-full rounded border bg-white text-left">
        <thead className="border-b bg-gray-100 text-sm">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Category</th>
            <th className="p-3">Price</th>
            <th className="p-3">Stock</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {products.data?.items.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="p-3">
                <div className="flex items-center gap-3">
                  <ProductImage src={p.imageUrl} alt={p.name} className="h-10 w-10 shrink-0" />
                  {p.name}
                </div>
              </td>
              <td className="p-3 text-gray-500">{p.category?.name}</td>
              <td className="p-3">${Number(p.price).toFixed(2)}</td>
              <td className="p-3">
                {p.stock} <StockBadge product={p} />
              </td>
              <td className="space-x-3 p-3 text-right">
                <Link to={`/admin/products/${p.id}/edit`} className="text-blue-600 hover:underline">
                  Edit
                </Link>
                <button onClick={() => onDelete(p)} className="text-red-600 hover:underline">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
