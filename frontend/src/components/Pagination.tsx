type Props = { page: number; totalPages: number; onChange: (page: number) => void };

// Previous / Page X of Y / Next. Used by the product list and the admin table.
export function Pagination({ page, totalPages, onChange }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="btn btn-outline">
        ← Previous
      </button>
      <span className="text-sm text-slate-600">
        Page {page} of {totalPages}
      </span>
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="btn btn-outline">
        Next →
      </button>
    </div>
  );
}
