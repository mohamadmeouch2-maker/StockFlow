import { useT } from "../i18n/useT";

type Props = { page: number; totalPages: number; onChange: (page: number) => void };

// Previous / Page X of Y / Next. Used by the product list and the admin table.
export function Pagination({ page, totalPages, onChange }: Props) {
  const { t } = useT();
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="btn btn-outline">
        {t("← Previous")}
      </button>
      <span className="text-sm text-slate-600">{t("Page {page} of {total}", { page, total: totalPages })}</span>
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="btn btn-outline">
        {t("Next →")}
      </button>
    </div>
  );
}
