import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { ordersApi } from "../api/orders";
import { useCart } from "../cart/useCart";

// FR-06 / FR-07: review the cart and place the order (guide 4.8).
export function CartPage() {
  const { items, setQuantity, remove, clear } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const placeOrder = useMutation({
    mutationFn: () => ordersApi.create(items.map((i) => ({ productId: i.product.id, quantity: i.quantity }))),
    onSuccess: () => {
      clear();
      queryClient.invalidateQueries({ queryKey: ["products"] }); // stock changed
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate("/orders");
    },
  });

  // For information only: the server calculates the real total (FR-08).
  const total = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);

  if (items.length === 0)
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Cart</h1>
        <p>
          Your cart is empty.{" "}
          <Link to="/products" className="text-blue-600 hover:underline">
            Browse products
          </Link>
        </p>
      </div>
    );

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Cart</h1>
      <ul className="divide-y rounded border bg-white">
        {items.map(({ product, quantity }) => (
          <li key={product.id} className="flex flex-wrap items-center gap-3 p-3">
            <Link to={`/products/${product.id}`} className="flex-1 font-medium hover:underline">
              {product.name}
            </Link>
            <span className="text-gray-500">${Number(product.price).toFixed(2)}</span>
            <label className="sr-only" htmlFor={`qty-${product.id}`}>
              Quantity of {product.name}
            </label>
            <input
              id={`qty-${product.id}`}
              type="number"
              min={1}
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(product.id, Number(e.target.value))}
              className="w-20 rounded border px-2 py-1"
            />
            <button onClick={() => remove(product.id)} className="text-red-600 hover:underline">
              Remove
            </button>
          </li>
        ))}
      </ul>

      <p className="text-lg font-semibold">Total: ${total.toFixed(2)}</p>

      {placeOrder.error instanceof ApiError && placeOrder.error.code === "INSUFFICIENT_STOCK" ? (
        <p className="text-red-600">
          Some items are no longer available ({placeOrder.error.message}). Adjust quantities and try again.
        </p>
      ) : (
        placeOrder.isError && <p className="text-red-600">Could not place the order. {placeOrder.error.message}</p>
      )}

      <button
        disabled={placeOrder.isPending}
        onClick={() => placeOrder.mutate()}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {placeOrder.isPending ? "Placing order..." : "Place order"}
      </button>
    </div>
  );
}
