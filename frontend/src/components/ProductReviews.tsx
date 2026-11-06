import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { reviewsApi } from "../api/reviews";
import { useAuth } from "../auth/useAuth";
import { RatingBadge } from "./RatingBadge";
import { ReviewForm } from "./ReviewForm";

// The "Ratings & reviews" section under a product.
export function ProductReviews({ productId }: { productId: number }) {
  const { user } = useAuth();
  const location = useLocation();
  const data = useQuery({ queryKey: ["reviews", productId], queryFn: () => reviewsApi.list(productId) });

  return (
    <section className="card space-y-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Ratings & reviews</h2>
        {data.data && <RatingBadge rating={data.data} size="lg" />}
      </div>

      {user?.role === "CUSTOMER" && <ReviewForm productId={productId} />}
      {!user && (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
          <Link to="/login" state={{ from: location }} className="link">
            Log in
          </Link>{" "}
          and buy this product to rate it.
        </p>
      )}

      {data.isLoading && <p className="text-slate-500">Loading...</p>}
      {data.isError && <p className="text-red-600">Could not load the reviews. {data.error.message}</p>}
      {data.data?.reviews.length === 0 && <p className="text-slate-500">No reviews yet. Be the first to rate it!</p>}

      <ul className="divide-y divide-slate-100">
        {data.data?.reviews.map((r) => (
          <li key={r.id} className="flex gap-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
              {r.userName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{r.userName}</span>
                <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-xs font-bold text-white">{r.rating}/10</span>
                <span className="text-xs text-slate-400">{new Date(r.updatedAt).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="mt-1 text-slate-600">{r.comment}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
