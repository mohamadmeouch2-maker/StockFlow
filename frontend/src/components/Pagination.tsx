type Props = { page: number; totalPages: number; onChange: (page: number) => void };

// Previous / Page X of Y / Next. Used by the product list and the admin table.
export function Pagination({ page, totalPages, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded border bg-white px-3 py-1 disabled:opacity-40"
      >
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded border bg-white px-3 py-1 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
