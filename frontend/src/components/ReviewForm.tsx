import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { reviewsApi } from "../api/reviews";

// For a logged-in customer on a product page: give a rating from 1 to 10 and a comment,
// or change/delete the one they gave before. Only possible after buying the product.
export function ReviewForm({ productId }: { productId: number }) {
  const qc = useQueryClient();
  const mine = useQuery({ queryKey: ["reviews", productId, "me"], queryFn: () => reviewsApi.mine(productId) });
  // What the customer picked or typed; until they touch the form, show their saved review.
  const [rating, setRating] = useState<number>();
  const [comment, setComment] = useState<string>();
  const [saved, setSaved] = useState(false);

  const existing = mine.data?.review;
  const currentRating = rating ?? existing?.rating;
  const currentComment = comment ?? existing?.comment ?? "";

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["reviews", productId] }); // the list and "mine"
    qc.invalidateQueries({ queryKey: ["product", productId] }); // the average on the page
    qc.invalidateQueries({ queryKey: ["products"] }); // the average in the list
  };
  const save = useMutation({
    mutationFn: () => reviewsApi.save(productId, { rating: currentRating!, comment: currentComment }),
    onSuccess: () => {
      setSaved(true);
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: () => reviewsApi.remove(productId),
    onSuccess: () => {
      setRating(undefined);
      setComment(undefined);
      setSaved(false);
      refresh();
    },
  });

  if (mine.isLoading) return null;
  if (!mine.data?.canReview)
    return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">You can rate this product after you buy it.</p>;

  return (
    <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
      <p className="font-semibold text-slate-900">{existing ? "Your review" : "Rate this product"}</p>
      <div role="radiogroup" aria-label="Your rating out of 10" className="flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = currentRating === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${n} out of 10`}
              onClick={() => {
                setRating(n);
                setSaved(false);
              }}
              className={`h-9 w-9 rounded-lg border text-sm font-semibold transition ${
                active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div>
        <label htmlFor={`review-comment-${productId}`} className="label">
          Comment (optional)
        </label>
        <textarea
          id={`review-comment-${productId}`}
          rows={2}
          maxLength={1000}
          value={currentComment}
          onChange={(e) => {
            setComment(e.target.value);
            setSaved(false);
          }}
          placeholder="What did you like or not like?"
          className="input"
        />
      </div>
      {(save.isError || remove.isError) && <p className="field-error">Could not save. {(save.error ?? remove.error)?.message}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={!currentRating || save.isPending} onClick={() => save.mutate()} className="btn btn-primary">
          {save.isPending ? "Saving..." : existing ? "Update review" : "Submit review"}
        </button>
        {existing && (
          <button disabled={remove.isPending} onClick={() => confirm("Delete your review?") && remove.mutate()} className="btn btn-danger">
            Delete
          </button>
        )}
        {!currentRating && <span className="text-sm text-slate-500">Pick a score from 1 to 10.</span>}
        {saved && <span className="text-sm font-medium text-emerald-700">Thanks! Your review is saved ✓</span>}
      </div>
    </div>
  );
}
