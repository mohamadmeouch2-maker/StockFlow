import { api } from "./client";
import type { Rating, Review } from "./types";

// Ratings (1 to 10) with comments, and product page views.
export const reviewsApi = {
  list: (productId: number) => api<Rating & { reviews: Review[] }>("core", `/api/products/${productId}/reviews`),
  // Customer only: may I rate it (did I buy it?) and my current review, if any
  mine: (productId: number) =>
    api<{ canReview: boolean; review: { rating: number; comment: string | null } | null }>("core", `/api/products/${productId}/reviews/me`),
  save: (productId: number, body: { rating: number; comment: string }) =>
    api<Review>("core", `/api/products/${productId}/reviews`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (productId: number) => api<void>("core", `/api/products/${productId}/reviews`, { method: "DELETE" }),
  countView: (productId: number) => api<void>("core", `/api/products/${productId}/view`, { method: "POST" }),
};
