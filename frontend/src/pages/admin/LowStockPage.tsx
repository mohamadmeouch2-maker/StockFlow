import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { reportsApi } from "../../api/reports";
import { ProductImage } from "../../components/ProductImage";
import { RowsSkeleton } from "../../components/Skeleton";
import { StockBadge } from "../../components/StockBadge";
import { useT } from "../../i18n/useT";

// FR-16: products that need restocking (stock at or below the reorder level), most urgent first.
export function LowStockPage() {
  const { t } = useT();
  const rows = useQuery({ queryKey: ["reports", "low-stock"], queryFn: reportsApi.lowStock, staleTime: 0 });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">{t("Low stock")}</h1>
        <p className="text-sm text-slate-500">{t("Products at or below their reorder level, the most urgent first.")}</p>
      </div>

      {rows.isLoading && <RowsSkeleton />}
      {rows.isError && (
        <p className="text-danger-600">
          {t("Could not load the report.")} {rows.error.message}
        </p>
      )}
      {rows.data?.length === 0 && <p>{t("All products have enough stock. 🎉")}</p>}

      {!!rows.data?.length && (
        <div className="data-table-wrap">
          {/* On a phone each product is a card (see .data-table-cards) */}
          <table className="data-table data-table-cards">
            <thead>
              <tr>
                <th>{t("Product")}</th>
                <th>{t("Category")}</th>
                <th>{t("Stock")}</th>
                <th>{t("Reorder level")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.data.map((r) => (
                <tr key={r.productId}>
                  <td className="cell-wide">
                    <div className="flex items-center gap-3">
                      <ProductImage src={r.imageUrl} alt={r.name} className="h-11 w-11 shrink-0" />
                      {r.name}
                    </div>
                  </td>
                  <td data-label={t("Category")} className="text-slate-500">
                    {r.category}
                  </td>
                  <td data-label={t("Stock")}>
                    {r.stock} <StockBadge product={r} />
                  </td>
                  <td data-label={t("Reorder level")}>{r.reorderLevel}</td>
                  <td className="cell-wide md:text-end">
                    <Link to={`/admin/products/${r.productId}/edit`} className="btn btn-outline px-3 py-1">
                      {t("Restock")}
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
