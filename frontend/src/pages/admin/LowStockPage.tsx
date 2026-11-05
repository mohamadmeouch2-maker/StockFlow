import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { reportsApi } from "../../api/reports";
import { StockBadge } from "../../components/StockBadge";

// FR-16: products that need restocking (stock at or below the reorder level), most urgent first.
export function LowStockPage() {
  const rows = useQuery({ queryKey: ["reports", "low-stock"], queryFn: reportsApi.lowStock, staleTime: 0 });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Low stock</h1>
      <p className="text-gray-600">Products at or below their reorder level.</p>

      {rows.isLoading && <p>Loading...</p>}
      {rows.isError && <p className="text-red-600">Could not load the report. {rows.error.message}</p>}
      {rows.data?.length === 0 && <p>All products have enough stock. 🎉</p>}

      {!!rows.data?.length && (
        <div className="overflow-x-auto">
          <table className="w-full rounded border bg-white text-left text-sm">
            <thead className="border-b bg-gray-100">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Category</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Reorder level</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.data.map((r) => (
                <tr key={r.productId} className="border-b last:border-0">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3 text-gray-500">{r.category}</td>
                  <td className="p-3">
                    {r.stock} <StockBadge product={r} />
                  </td>
                  <td className="p-3">{r.reorderLevel}</td>
                  <td className="p-3 text-right">
                    <Link to={`/admin/products/${r.productId}/edit`} className="text-blue-600 hover:underline">
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
