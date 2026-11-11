import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ApiError } from "../api/client";
import { ordersApi } from "../api/orders";
import type { DeliveryMethod, DeliveryOption, ShipTo } from "../api/types";
import { useCart } from "../cart/useCart";
import { FormField } from "../components/FormField";
import { ProductImage } from "../components/ProductImage";
import { useToast } from "../toast/useToast";
import { addDays, effectivePrice, shortDate } from "../utils/format";

// Where to deliver: the same rules as the API, so mistakes show before sending.
// A phone number like "+961 70 123 456", "03-123456" or "70123456" (7 to 15 digits).
const digits = (v: string) => v.replace(/\D/g, "").length;
const shipToSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine((v) => /^\+?[\d\s-]+$/.test(v) && digits(v) >= 7 && digits(v) <= 15, { message: "Enter a valid phone number, for example +961 70 123 456" }),
  city: z.string().trim().min(2, "Enter the city").max(60, "At most 60 characters"),
  address: z.string().trim().min(5, "Enter the street, building and floor").max(300, "At most 300 characters"),
});

// "Next day" or "3–5 days"
const howLong = (o: DeliveryOption) => (o.maxDays === 1 ? "Next day" : o.minDays === o.maxDays ? `${o.maxDays} days` : `${o.minDays}–${o.maxDays} days`);

// FR-06 / FR-07: review the cart and place the order (guide 4.8).
export function CartPage() {
  const { items, setQuantity, remove, clear } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  // Standard (free) or Express (costs more, arrives sooner). The prices come from the API.
  const [delivery, setDelivery] = useState<DeliveryMethod>("STANDARD");
  const options = useQuery({ queryKey: ["delivery-options"], queryFn: ordersApi.deliveryOptions, staleTime: Infinity });

  // Where to deliver. The address of the last order is filled in, and the customer can change it.
  const lastAddress = useQuery({ queryKey: ["orders", "last-address"], queryFn: ordersApi.lastAddress, staleTime: Infinity, enabled: items.length > 0 });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ShipTo>({
    resolver: zodResolver(shipToSchema),
    defaultValues: { phone: "", city: "", address: "" },
    values: lastAddress.data ?? undefined,
    resetOptions: { keepDirtyValues: true }, // anything the customer already typed stays
  });

  const placeOrder = useMutation({
    mutationFn: (shipTo: ShipTo) =>
      ordersApi.create(
        items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        delivery,
        shipTo,
      ),
    onSuccess: (order) => {
      clear();
      queryClient.invalidateQueries({ queryKey: ["products"] }); // stock changed
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate("/orders");
      toast(`Order #${order.id} placed. It arrives by ${shortDate(order.deliverBy ?? new Date())}. Thank you!`);
    },
    // A field the server didn't accept: its message goes under that field
    onError: (err) => {
      if (err instanceof ApiError)
        for (const d of err.details) if (d.field in shipToSchema.shape) setError(d.field as keyof ShipTo, { message: d.message });
    },
  });

  // For information only: the server calculates the real total (FR-08).
  const subtotal = items.reduce((sum, i) => sum + effectivePrice(i.product) * i.quantity, 0);
  const deliveryFee = Number(options.data?.find((o) => o.id === delivery)?.fee ?? 0);
  const total = subtotal + deliveryFee;

  if (items.length === 0)
    return (
      <div className="card mx-auto max-w-md space-y-4 p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl">🛒</div>
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
        <div className="space-y-6 lg:col-span-2">
          <ul className="card divide-y divide-slate-100">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="flex flex-wrap items-center gap-4 p-4">
                <ProductImage src={product.imageUrl} alt={product.name} className="h-16 w-16" />
                <div className="min-w-0 flex-1">
                  <Link to={`/products/${product.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                    {product.name}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {product.salePrice && <del className="mr-1">${Number(product.price).toFixed(2)}</del>}
                    <span className={product.salePrice ? "font-medium text-sale-600" : ""}>${effectivePrice(product).toFixed(2)}</span> each
                    {product.promotion && <span className="ml-1 rounded bg-sale-600 px-1 text-xs font-bold text-white">-{product.promotion.percent}%</span>}
                  </p>
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
                <span className="w-20 text-right font-semibold">${(effectivePrice(product) * quantity).toFixed(2)}</span>
                <button onClick={() => remove(product.id)} className="text-sm text-danger-600 hover:underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>

          {/* Where to deliver. The "Place order" button in the summary sends this form. */}
          <form id="checkout" onSubmit={handleSubmit((shipTo) => placeOrder.mutate(shipTo))} className="card space-y-4 p-6">
            <div>
              <h2 className="font-semibold text-slate-900">
                <span aria-hidden="true">📍 </span>Delivery address
              </h2>
              <p className="text-sm text-slate-500">
                {lastAddress.data ? "Filled in from your last order. Change it if this one goes somewhere else." : "Where should we bring your order?"}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="phone" label="Phone number" type="tel" autoComplete="tel" placeholder="+961 70 123 456" maxLength={25} {...register("phone")} error={errors.phone?.message} />
              <FormField id="city" label="City" autoComplete="address-level2" placeholder="Beirut" maxLength={60} {...register("city")} error={errors.city?.message} />
            </div>
            <div>
              <label htmlFor="address" className="label">
                Address
              </label>
              <textarea id="address" rows={2} autoComplete="street-address" placeholder="Street, building, floor" maxLength={300} {...register("address")} className="input" />
              {errors.address && <p className="field-error">{errors.address.message}</p>}
            </div>
          </form>
        </div>

        <div className="card h-fit space-y-4 p-6">
          <h2 className="font-semibold text-slate-900">Order summary</h2>
          {/* Delivery: the same products, faster for a higher price */}
          <fieldset className="space-y-2">
            <legend className="label">Delivery</legend>
            {options.data?.map((o) => {
              const chosen = delivery === o.id;
              return (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    chosen ? "border-brand-600 bg-brand-50/60 ring-1 ring-brand-600" : "border-slate-200 hover:border-brand-300"
                  }`}
                >
                  <input type="radio" name="delivery" value={o.id} checked={chosen} onChange={() => setDelivery(o.id)} className="mt-1 accent-brand-600" />
                  <span className="flex-1">
                    <span className="flex justify-between gap-2 font-medium text-slate-900">
                      <span>
                        <span aria-hidden="true">{o.id === "EXPRESS" ? "⚡ " : "🚚 "}</span>
                        {o.label}
                      </span>
                      <span>{Number(o.fee) === 0 ? "Free" : `+$${o.fee}`}</span>
                    </span>
                    <span className="block text-sm text-slate-500">
                      {howLong(o)} · arrives by {shortDate(addDays(o.maxDays))}
                    </span>
                  </span>
                </label>
              );
            })}
            {options.isError && <p className="text-sm text-slate-500">Standard delivery (free) will be used.</p>}
          </fieldset>

          <div className="space-y-1.5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Items ({pieces})</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{deliveryFee === 0 ? "Free" : `$${deliveryFee.toFixed(2)}`}</span>
            </div>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-bold text-slate-900">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-500">The final total is calculated by the server from the current prices.</p>

          {placeOrder.error instanceof ApiError && placeOrder.error.code === "INSUFFICIENT_STOCK" ? (
            <p className="alert-danger">Some items are no longer available ({placeOrder.error.message}). Adjust quantities and try again.</p>
          ) : (
            placeOrder.isError && <p className="alert-danger">Could not place the order. {placeOrder.error.message}</p>
          )}

          <button type="submit" form="checkout" disabled={placeOrder.isPending} className="btn btn-primary w-full py-2.5">
            {placeOrder.isPending ? "Placing order..." : "Place order"}
          </button>
        </div>
      </div>
    </div>
  );
}
