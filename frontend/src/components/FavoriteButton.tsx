import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { favoritesApi } from "../api/favorites";
import type { Product } from "../api/types";
import { AuthContext } from "../auth/authContext";
import { useToast } from "../toast/useToast";

// The heart on a product: empty = not saved, red = saved in "My favourites". Only customers see it.
export function FavoriteButton({ product, className = "" }: { product: Product; className?: string }) {
  const user = useContext(AuthContext)?.user; // outside an AuthProvider (e.g. some tests) = not logged in
  const isCustomer = user?.role === "CUSTOMER";
  const qc = useQueryClient();
  const toast = useToast();
  // One shared list for every heart on the page (TanStack Query loads it once)
  const favorites = useQuery({ queryKey: ["favorites"], queryFn: favoritesApi.list, enabled: isCustomer });
  const saved = !!favorites.data?.some((p) => p.id === product.id);

  const toggle = useMutation({
    mutationFn: () => (saved ? favoritesApi.remove(product.id) : favoritesApi.add(product.id)),
    onSuccess: () => {
      toast(saved ? `${product.name} removed from your favourites` : `${product.name} saved to your favourites`, saved ? "info" : "success");
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: () => toast("Could not update your favourites. Please try again.", "error"),
  });

  if (!isCustomer) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault(); // the heart may sit inside a link
        toggle.mutate();
      }}
      disabled={toggle.isPending || favorites.isLoading}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from favourites` : `Save ${product.name} to favourites`}
      title={saved ? "Remove from favourites" : "Save to favourites"}
      className={`rounded-full p-1.5 transition hover:bg-rose-50 ${saved ? "text-rose-600" : "text-slate-400 hover:text-rose-500"} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M12 20.5s-7.6-4.6-9.5-9.3C1.1 7.8 3.2 4 7 4c2.1 0 3.5 1.1 5 2.9C13.5 5.1 14.9 4 17 4c3.8 0 5.9 3.8 4.5 7.2-1.9 4.7-9.5 9.3-9.5 9.3Z" />
      </svg>
    </button>
  );
}
