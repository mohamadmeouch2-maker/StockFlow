import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { ApiError } from "../../api/client";
import { productsApi } from "../../api/products";

// FR-11: one form for both "new product" and "edit product" (guide 4.10).
const schema = z.object({
  name: z.string().min(2, "At least 2 characters"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Must be above 0"),
  stock: z.coerce.number().int("Must be a whole number").min(0, "Cannot be negative"),
  reorderLevel: z.coerce.number().int("Must be a whole number").min(0, "Cannot be negative"),
  categoryId: z.coerce.number().int().min(1, "Pick a category"),
});
type FormInput = z.input<typeof schema>; // what the inputs hold (text)
type FormValues = z.output<typeof schema>; // what we get after validation (numbers)

export function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const categories = useQuery({ queryKey: ["categories"], queryFn: productsApi.categories });
  const existing = useQuery({ queryKey: ["product", Number(id)], queryFn: () => productsApi.get(Number(id)), enabled: isEdit });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(schema), defaultValues: { reorderLevel: 5 } });

  // When editing, fill the form once the product has loaded.
  useEffect(() => {
    if (existing.data) {
      const p = existing.data;
      reset({ name: p.name, description: p.description ?? "", price: Number(p.price), stock: p.stock, reorderLevel: p.reorderLevel, categoryId: p.categoryId });
    }
  }, [existing.data, reset]);

  const save = useMutation({
    mutationFn: (v: FormValues) => (isEdit ? productsApi.update(Number(id), v) : productsApi.create(v)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      navigate("/admin/products");
    },
    onError: (err) => {
      // Show server-side validation errors next to the right field
      if (err instanceof ApiError) err.details.forEach((d) => setError(d.field as keyof FormInput, { message: d.message }));
    },
  });

  const field = (name: keyof FormInput, label: string, type = "text") => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input id={name} type={type} step="any" {...register(name)} className="w-full rounded border bg-white px-3 py-2" />
      {errors[name] && <p className="text-sm text-red-600">{errors[name]?.message}</p>}
    </div>
  );

  // Wait for the categories too: the select can only show the product's
  // category once its <option> exists.
  if (categories.isLoading || (isEdit && existing.isLoading)) return <p>Loading...</p>;
  if (isEdit && existing.isError) return <p className="text-red-600">{existing.error.message}</p>;

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">{isEdit ? "Edit product" : "New product"}</h1>
      {field("name", "Name")}
      {field("description", "Description")}
      {field("price", "Price", "number")}
      {field("stock", "Stock", "number")}
      {field("reorderLevel", "Reorder level", "number")}
      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium">
          Category
        </label>
        <select id="categoryId" {...register("categoryId")} className="w-full rounded border bg-white px-3 py-2">
          <option value="0">Select...</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.categoryId && <p className="text-sm text-red-600">{errors.categoryId.message}</p>}
      </div>
      {save.isError && !(save.error instanceof ApiError && save.error.details.length) && (
        <p className="text-red-600">Could not save. {save.error.message}</p>
      )}
      <div className="flex gap-3">
        <button disabled={isSubmitting || save.isPending} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {save.isPending ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={() => navigate("/admin/products")} className="rounded border bg-white px-4 py-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
