import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { categoriesApi } from "../../api/categories";
import { ApiError } from "../../api/client";
import type { Category } from "../../api/types";
import { RowsSkeleton } from "../../components/Skeleton";
import { useToast } from "../../toast/useToast";

// The server's message for one field if there is one, e.g. '"Office" already exists'.
const errorText = (err: unknown) => (err instanceof ApiError && err.details[0]?.message) || (err instanceof Error ? err.message : "Something went wrong");

// FR-11 (admin): add, rename and delete categories. A category that still has products can't be deleted.
export function CategoriesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  // staleTime 0: fresh product counts every time the page opens
  const categories = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list, staleTime: 0 });
  // The category buttons, the product form and the product pages show category names too
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["product"] });
  };

  const [name, setName] = useState("");
  const add = useMutation({
    mutationFn: () => categoriesApi.create(name.trim()),
    onSuccess: (c) => {
      toast(`"${c.name}" added`);
      setName("");
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (c: Category) => categoriesApi.remove(c.id),
    onSuccess: (_, c) => {
      toast(`"${c.name}" deleted`);
      refresh();
    },
    onError: (err) => toast(errorText(err), "error"),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="text-sm text-slate-500">Products are grouped in categories. A category that still has products can't be deleted.</p>
        </div>
        <Link to="/admin/products" className="btn btn-outline">
          ← Manage products
        </Link>
      </div>

      {/* Add a category */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
        className="card flex flex-wrap items-start gap-3 p-4"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="new-category" className="sr-only">
            New category name
          </label>
          <input
            id="new-category"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              add.reset(); // hide an old error while typing
            }}
            placeholder="New category name, for example Kitchen"
            maxLength={100}
            className="input"
          />
          {add.isError && <p className="field-error">{errorText(add.error)}</p>}
        </div>
        <button disabled={name.trim().length < 2 || add.isPending} className="btn btn-primary">
          + Add category
        </button>
      </form>

      {categories.isLoading && <RowsSkeleton rows={4} />}
      {categories.isError && <p className="text-danger-600">Could not load the categories. {categories.error.message}</p>}
      {categories.data?.length === 0 && <div className="card p-10 text-center text-slate-500">No categories yet. Add the first one above.</div>}

      {!!categories.data?.length && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Products</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.data.map((c) => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  deleting={remove.isPending}
                  onDelete={() => confirm(`Delete the category "${c.name}"?`) && remove.mutate(c)}
                  onSaved={refresh}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// One row of the table: the name, or a small form while renaming it.
function CategoryRow({ category, deleting, onDelete, onSaved }: { category: Category; deleting: boolean; onDelete: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const rename = useMutation({
    mutationFn: () => categoriesApi.rename(category.id, name.trim()),
    onSuccess: (c) => {
      toast(`Renamed to "${c.name}"`);
      setEditing(false);
      onSaved();
    },
  });
  const count = category.productCount ?? 0;
  const cancel = () => {
    setEditing(false);
    setName(category.name);
    rename.reset();
  };

  return (
    <tr>
      <td>
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              rename.mutate();
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <label htmlFor={`rename-${category.id}`} className="sr-only">
              New name for {category.name}
            </label>
            <input
              id={`rename-${category.id}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                rename.reset();
              }}
              onKeyDown={(e) => e.key === "Escape" && cancel()}
              autoFocus
              maxLength={100}
              className="input w-56 py-1.5"
            />
            <button disabled={name.trim().length < 2 || rename.isPending} className="btn btn-primary px-3 py-1">
              Save
            </button>
            <button type="button" onClick={cancel} className="btn btn-outline px-3 py-1">
              Cancel
            </button>
            {rename.isError && <p className="field-error w-full">{errorText(rename.error)}</p>}
          </form>
        ) : (
          <span className="font-medium text-slate-900">{category.name}</span>
        )}
      </td>
      <td className="text-slate-500">
        {count} {count === 1 ? "product" : "products"}
      </td>
      <td className="text-right whitespace-nowrap">
        {!editing && (
          <>
            <button onClick={() => setEditing(true)} className="btn btn-outline mr-2 px-3 py-1">
              Rename
            </button>
            <button
              onClick={onDelete}
              disabled={deleting || count > 0}
              title={count > 0 ? "Move or delete its products first" : undefined}
              className="btn btn-danger px-3 py-1"
            >
              Delete
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
