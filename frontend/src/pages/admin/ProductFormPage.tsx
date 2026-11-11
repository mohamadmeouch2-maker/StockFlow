import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { ApiError } from "../../api/client";
import { IMAGE_TYPES, MAX_IMAGE_MB, productsApi } from "../../api/products";
import { ProductImage } from "../../components/ProductImage";
import { FormSkeleton } from "../../components/Skeleton";
import { useToast } from "../../toast/useToast";

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

const errorText = (err: unknown) => (err instanceof ApiError && err.details[0]?.message) || (err instanceof Error ? err.message : "Unknown error");

export function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

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

  // FR-17: the chosen photo (with a preview URL). It is uploaded after the product is saved.
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [photoRemoved, setPhotoRemoved] = useState(false);
  // Free the preview's memory when the photo changes or the page closes.
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  const choosePhoto = (file: File | undefined) => {
    setPhotoError("");
    setPhoto(null);
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setPhotoError("Use a JPG, PNG, WebP or GIF image");
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return setPhotoError(`The image must be ${MAX_IMAGE_MB} MB or smaller`);
    setPhoto({ file, url: URL.createObjectURL(file) });
  };

  const refreshLists = () => {
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
  };

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const saved = isEdit ? await productsApi.update(Number(id), v) : await productsApi.create(v);
      if (!photo) return { saved, uploadError: "" };
      try {
        await productsApi.uploadImage(saved.id, photo.file);
        return { saved, uploadError: "" };
      } catch (err) {
        return { saved, uploadError: errorText(err) };
      }
    },
    onSuccess: ({ saved, uploadError }) => {
      refreshLists();
      qc.invalidateQueries({ queryKey: ["product"] });
      if (uploadError) {
        // The product exists now; stay on its edit page so the photo can be tried again.
        setPhotoError(`The product was saved, but the photo was not: ${uploadError}`);
        if (!isEdit) navigate(`/admin/products/${saved.id}/edit`, { replace: true });
        return;
      }
      toast(isEdit ? `"${saved.name}" saved` : `"${saved.name}" added to the shop`);
      navigate("/admin/products");
    },
    onError: (err) => {
      // Show server-side validation errors next to the right field
      if (err instanceof ApiError) err.details.forEach((d) => setError(d.field as keyof FormInput, { message: d.message }));
    },
  });

  const removePhoto = useMutation({
    mutationFn: () => productsApi.removeImage(Number(id)),
    onSuccess: () => {
      setPhotoRemoved(true);
      refreshLists();
      qc.invalidateQueries({ queryKey: ["product"], refetchType: "none" }); // don't reload (and reset) this form
    },
  });

  const field = (name: keyof FormInput, label: string, type = "text") => (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} type={type} step="any" {...register(name)} className="input" />
      {errors[name] && <p className="field-error">{errors[name]?.message}</p>}
    </div>
  );

  // Wait for the categories too: the select can only show the product's
  // category once its <option> exists.
  if (categories.isLoading || (isEdit && existing.isLoading)) return <FormSkeleton />;
  if (isEdit && existing.isError) return <p className="text-danger-600">{existing.error.message}</p>;

  const currentImage = photoRemoved ? null : existing.data?.imageUrl;

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="card mx-auto max-w-2xl space-y-5 p-6 sm:p-8">
      <div>
        <h1 className="page-title">{isEdit ? "Edit product" : "New product"}</h1>
        <p className="text-sm text-slate-500">Fields are checked here and again on the server.</p>
      </div>
      {field("name", "Name")}
      {field("description", "Description")}
      {field("price", "Price", "number")}
      {field("stock", "Stock", "number")}
      {field("reorderLevel", "Reorder level", "number")}
      <div>
        <label htmlFor="categoryId" className="label">
          Category
        </label>
        <select id="categoryId" {...register("categoryId")} className="input">
          <option value="0">Select...</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.categoryId && <p className="field-error">{errors.categoryId.message}</p>}
      </div>

      <div>
        <label htmlFor="image" className="label">
          Photo
        </label>
        <div className="mt-1 flex items-center gap-4">
          {photo ? (
            <img src={photo.url} alt="New photo preview" className="h-24 w-24 shrink-0 rounded object-cover" />
          ) : (
            <ProductImage src={currentImage} alt="Current photo" className="h-24 w-24 shrink-0" />
          )}
          <div className="min-w-0 space-y-2 text-sm">
            <input
              id="image"
              type="file"
              accept={IMAGE_TYPES.join(",")}
              onChange={(e) => choosePhoto(e.target.files?.[0])}
              className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-brand-700"
            />
            <p className="text-xs text-slate-500">JPG, PNG, WebP or GIF, up to {MAX_IMAGE_MB} MB. It is uploaded when you click Save.</p>
            {isEdit && currentImage && !photo && (
              <button
                type="button"
                disabled={removePhoto.isPending}
                onClick={() => confirm("Remove this photo?") && removePhoto.mutate()}
                className="btn btn-danger px-3 py-1"
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
        {photoError && <p className="field-error">{photoError}</p>}
        {removePhoto.isError && <p className="field-error">Could not remove the photo. {removePhoto.error.message}</p>}
      </div>

      {save.isError && !(save.error instanceof ApiError && save.error.details.length) && <p className="alert-danger">Could not save. {save.error.message}</p>}
      <div className="flex gap-3 border-t border-slate-100 pt-5">
        <button disabled={isSubmitting || save.isPending} className="btn btn-primary px-6">
          {save.isPending ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={() => navigate("/admin/products")} className="btn btn-outline">
          Cancel
        </button>
      </div>
    </form>
  );
}
