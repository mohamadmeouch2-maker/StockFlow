import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { ordersApi } from "../api/orders";
import { useCart } from "../cart/useCart";
import { ProductImage } from "../components/ProductImage";

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
      <div className="card mx-auto max-w-md space-y-4 p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">🛒</div>
        <h1 className="page-title">Your cart is empty</h1>
        <p className="text-slate-500">Find something you need and add it to your cart.</p>
        <Link to="/products" className="btn btn-primary">
          Browse products
        </Link>
      </div>
    );

  const pieces = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="space-y-5">
      <h1 className="page-title">Your cart</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <ul className="card divide-y divide-slate-100 lg:col-span-2">
          {items.map(({ product, quantity }) => (
            <li key={product.id} className="flex flex-wrap items-center gap-4 p-4">
              <ProductImage src={product.imageUrl} alt={product.name} className="h-16 w-16" />
              <div className="min-w-0 flex-1">
                <Link to={`/products/${product.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                  {product.name}
                </Link>
                <p className="text-sm text-slate-500">${Number(product.price).toFixed(2)} each</p>
              </div>
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
                className="input w-20"
              />
              <span className="w-20 text-right font-semibold">${(Number(product.price) * quantity).toFixed(2)}</span>
              <button onClick={() => remove(product.id)} className="text-sm text-red-600 hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>

        <div className="card h-fit space-y-4 p-6">
          <h2 className="font-semibold text-slate-900">Order summary</h2>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Items</span>
            <span>{pieces}</span>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-bold text-slate-900">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-500">The final total is calculated by the server from the current prices.</p>

          {placeOrder.error instanceof ApiError && placeOrder.error.code === "INSUFFICIENT_STOCK" ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Some items are no longer available ({placeOrder.error.message}). Adjust quantities and try again.
            </p>
          ) : (
            placeOrder.isError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Could not place the order. {placeOrder.error.message}</p>
            )
          )}

          <button disabled={placeOrder.isPending} onClick={() => placeOrder.mutate()} className="btn btn-primary w-full py-2.5">
            {placeOrder.isPending ? "Placing order..." : "Place order"}
          </button>
        </div>
      </div>
    </div>
  );
}
