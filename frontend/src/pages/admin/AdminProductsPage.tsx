import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { productsApi } from "../../api/products";
import type { Product } from "../../api/types";
import { Pagination } from "../../components/Pagination";
import { Price } from "../../components/Price";
import { ProductImage } from "../../components/ProductImage";
import { RatingBadge } from "../../components/RatingBadge";
import { RowsSkeleton } from "../../components/Skeleton";
import { StockBadge } from "../../components/StockBadge";
import { useToast } from "../../toast/useToast";

// FR-11 (admin): table of all products with Edit and Delete, plus a "New product" button.
export function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const toast = useToast();

  const products = useQuery({
    queryKey: ["products", "admin", page],
    queryFn: () => productsApi.list({ page }),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (p: Product) => productsApi.remove(p.id),
    onSuccess: (_, p) => {
      toast(`"${p.name}" deleted`);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
    },
  });

  const onDelete = (p: Product) => {
    if (confirm(`Delete "${p.name}"?`)) remove.mutate(p);
  };

  const totalPages = products.data ? Math.max(1, Math.ceil(products.data.total / products.data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Manage products</h1>
          <p className="text-sm text-slate-500">{products.data ? `${products.data.total} products` : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/categories" className="btn btn-outline">
            Categories
          </Link>
          <Link to="/admin/products/new" className="btn btn-primary">
            + New product
          </Link>
        </div>
      </div>

      {products.isLoading && <RowsSkeleton />}
      {products.isError && <p className="text-danger-600">Could not load products. {products.error.message}</p>}
      {remove.isError && <p className="alert-danger">Could not delete. {remove.error.message}</p>}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Rating</th>
              <th>Views</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.data?.items.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <ProductImage src={p.imageUrl} alt={p.name} className="h-11 w-11 shrink-0" />
                    <span className="font-medium text-slate-900">{p.name}</span>
                  </div>
                </td>
                <td className="text-slate-500">{p.category?.name}</td>
                <td>
                  <Price product={p} size="sm" />
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-right">{p.stock}</span>
                    <StockBadge product={p} />
                  </div>
                </td>
                <td>
                  <RatingBadge rating={p.rating} />
                </td>
                <td className="text-slate-500">{p.viewCount ?? 0}</td>
                <td className="text-right whitespace-nowrap">
                  <Link to={`/admin/products/${p.id}/edit`} className="btn btn-outline mr-2 px-3 py-1">
                    Edit
                  </Link>
                  <button onClick={() => onDelete(p)} className="btn btn-danger px-3 py-1">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
