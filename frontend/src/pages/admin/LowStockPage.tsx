import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { reportsApi } from "../../api/reports";
import { ProductImage } from "../../components/ProductImage";
import { RowsSkeleton } from "../../components/Skeleton";
import { StockBadge } from "../../components/StockBadge";

// FR-16: products that need restocking (stock at or below the reorder level), most urgent first.
export function LowStockPage() {
  const rows = useQuery({ queryKey: ["reports", "low-stock"], queryFn: reportsApi.lowStock, staleTime: 0 });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Low stock</h1>
        <p className="text-sm text-slate-500">Products at or below their reorder level, the most urgent first.</p>
      </div>

      {rows.isLoading && <RowsSkeleton />}
      {rows.isError && <p className="text-red-600">Could not load the report. {rows.error.message}</p>}
      {rows.data?.length === 0 && <p>All products have enough stock. 🎉</p>}

      {!!rows.data?.length && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Reorder level</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.data.map((r) => (
                <tr key={r.productId}>
                  <td>
                    <div className="flex items-center gap-3">
                      <ProductImage src={r.imageUrl} alt={r.name} className="h-11 w-11 shrink-0" />
                      {r.name}
                    </div>
                  </td>
                  <td className="text-slate-500">{r.category}</td>
                  <td>
                    {r.stock} <StockBadge product={r} />
                  </td>
                  <td>{r.reorderLevel}</td>
                  <td className="text-right">
                    <Link to={`/admin/products/${r.productId}/edit`} className="btn btn-outline px-3 py-1">
                      Restock
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
