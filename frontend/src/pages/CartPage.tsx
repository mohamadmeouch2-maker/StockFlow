import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { ordersApi } from "../api/orders";
import type { DeliveryMethod, DeliveryOption, ShipTo } from "../api/types";
import { useCart } from "../cart/useCart";
import { FormField } from "../components/FormField";
import { ProductImage } from "../components/ProductImage";
import { useToast } from "../toast/useToast";
import { addDays, effectivePrice, shortDate } from "../utils/format";
import { shipToSchema } from "../utils/validation";
import { useT } from "../i18n/useT";
import { t as tr, tx } from "../i18n/core";
import { useCurrency } from "../currency/useCurrency";
import { formatMoney } from "../currency/money";

// "Next day" or "3–5 days"
const howLong = (o: DeliveryOption) =>
  o.maxDays === 1
    ? tr("Next day")
    : o.minDays === o.maxDays
      ? tr("{count} days", { count: o.maxDays })
      : tr("{min}–{count} days", { min: o.minDays, count: o.maxDays });

// Money compared in cents, so 0.1 + 0.2 rounding errors can't change the delivery price
const cents = (amount: number) => Math.round(amount * 100);

// FR-06 / FR-07: review the cart and place the order (guide 4.8).
export function CartPage() {
  const { t, locale } = useT();
  const { money, currency, rate } = useCurrency();
  const { items, setQuantity, remove, clear } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  // Standard ($3, free from $60) or Express (costs more, arrives sooner). The prices come from the API.
  const [delivery, setDelivery] = useState<DeliveryMethod>("STANDARD");
  const options = useQuery({ queryKey: ["delivery-options"], queryFn: ordersApi.deliveryOptions, staleTime: Infinity });

  // Where to deliver. The address saved in My account (or else the last order's) is filled in,
  // and the customer can change it for this order.
  const saved = useQuery({ queryKey: ["orders", "saved-address"], queryFn: ordersApi.savedAddress, staleTime: Infinity, enabled: items.length > 0 });
  const savedShipTo = saved.data ? { phone: saved.data.phone, city: saved.data.city, address: saved.data.address } : undefined;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ShipTo>({
    resolver: zodResolver(shipToSchema),
    defaultValues: { phone: "", city: "", address: "" },
    values: savedShipTo,
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
      toast(t("Order #{id} placed. It arrives by {date}. Thank you!", { id: order.id, date: shortDate(order.deliverBy ?? new Date()) }));
    },
    // A field the server didn't accept: its message goes under that field
    onError: (err) => {
      if (err instanceof ApiError) for (const d of err.details) if (d.field in shipToSchema.shape) setError(d.field as keyof ShipTo, { message: d.message });
    },
  });

  // For information only: the server calculates the real total (FR-08).
  const subtotal = items.reduce((sum, i) => sum + effectivePrice(i.product) * i.quantity, 0);
  // What a delivery costs for this cart: Standard is free from its "freeFrom" amount ($60)
  const feeOf = (o: DeliveryOption) => (o.freeFrom !== null && cents(subtotal) >= cents(Number(o.freeFrom)) ? 0 : Number(o.fee));
  const chosen = options.data?.find((o) => o.id === delivery);
  const deliveryFee = chosen ? feeOf(chosen) : null; // null: the options are not loaded
  const total = subtotal + (deliveryFee ?? 0);
  // How much more the customer needs to buy for free delivery (0 = they have it)
  const freeOption = options.data?.find((o) => o.freeFrom !== null);
  const missing = freeOption ? Math.max(0, cents(Number(freeOption.freeFrom)) - cents(subtotal)) / 100 : 0;

  if (items.length === 0)
    return (
      <div className="card mx-auto max-w-md space-y-4 p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl">🛒</div>
        <h1 className="page-title">{t("Your cart is empty")}</h1>
        <p className="text-slate-500">{t("Find something you need and add it to your cart.")}</p>
        <Link to="/products" className="btn btn-primary">
          {t("Browse products")}
        </Link>
      </div>
    );

  const pieces = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="space-y-5">
      <h1 className="page-title">{t("Your cart")}</h1>
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
                    {product.salePrice && <del className="me-1">{money(product.price)}</del>}
                    {tx("{price} each", {
                      price: (
                        <span key="price" className={product.salePrice ? "font-medium text-sale-600" : ""}>
                          {money(effectivePrice(product))}
                        </span>
                      ),
                    })}
                    {product.promotion && <span className="ms-1 rounded bg-sale-600 px-1 text-xs font-bold text-white">-{product.promotion.percent}%</span>}
                  </p>
                </div>
                <label className="sr-only" htmlFor={`qty-${product.id}`}>
                  {t("Quantity of {name}", { name: product.name })}
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
                <span className="min-w-20 text-end font-semibold">{money(effectivePrice(product) * quantity)}</span>
                <button onClick={() => remove(product.id)} className="text-sm text-danger-600 hover:underline">
                  {t("Remove")}
                </button>
              </li>
            ))}
          </ul>

          {/* Where to deliver. The "Place order" button in the summary sends this form. */}
          <form id="checkout" onSubmit={handleSubmit((shipTo) => placeOrder.mutate(shipTo))} className="card space-y-4 p-6">
            <div>
              <h2 className="font-semibold text-slate-900">
                <span aria-hidden="true">📍 </span>
                {t("Delivery address")}
              </h2>
              <p className="text-sm text-slate-500">
                {saved.data
                  ? saved.data.from === "account"
                    ? t("Filled in from My account. Change it if this one goes somewhere else.")
                    : t("Filled in from your last order. Change it if this one goes somewhere else.")
                  : t("Where should we bring your order?")}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="phone"
                label={t("Phone number")}
                type="tel"
                autoComplete="tel"
                placeholder="+961 70 123 456"
                maxLength={25}
                {...register("phone")}
                error={errors.phone?.message}
              />
              <FormField
                id="city"
                label={t("City")}
                autoComplete="address-level2"
                placeholder={t("Beirut")}
                maxLength={60}
                {...register("city")}
                error={errors.city?.message}
              />
            </div>
            <div>
              <label htmlFor="address" className="label">
                {t("Address")}
              </label>
              <textarea
                id="address"
                rows={2}
                autoComplete="street-address"
                placeholder={t("Street, building, floor")}
                maxLength={300}
                {...register("address")}
                className="input"
              />
              {errors.address?.message && <p className="field-error">{t(errors.address.message)}</p>}
            </div>
          </form>
        </div>

        <div className="card h-fit space-y-4 p-6">
          <h2 className="font-semibold text-slate-900">{t("Order summary")}</h2>
          {/* Delivery: the same products, faster for a higher price */}
          <fieldset className="space-y-2">
            <legend className="label">{t("Delivery")}</legend>
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
                        {t(o.label)}
                      </span>
                      <span>
                        {/* Free from $60: the usual price crossed out */}
                        {feeOf(o) < Number(o.fee) && <del className="me-1 font-normal text-slate-400">{money(o.fee)}</del>}
                        {feeOf(o) === 0 ? t("Free") : `+${money(feeOf(o))}`}
                      </span>
                    </span>
                    <span className="block text-sm text-slate-500">
                      {howLong(o)} · {t("arrives by {date}", { date: shortDate(addDays(o.maxDays)) })}
                    </span>
                  </span>
                </label>
              );
            })}
            {options.isError && <p className="text-sm text-slate-500">{t("Standard delivery will be used.")}</p>}
            {/* Free standard delivery from $60: how far the cart is from it */}
            {freeOption &&
              (missing > 0 ? (
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {t("Add {amount} more for free standard delivery.", { amount: money(missing) })}
                  <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${(subtotal / Number(freeOption.freeFrom)) * 100}%` }} />
                  </div>
                </div>
              ) : (
                <p className="rounded-lg bg-success-50 px-3 py-2 text-sm font-medium text-success-700">
                  <span aria-hidden="true">🎉 </span>
                  {t("Your order gets free standard delivery.")}
                </p>
              ))}
          </fieldset>

          <div className="space-y-1.5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>{t("Items ({count})", { count: pieces })}</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("Delivery")}</span>
              <span>{deliveryFee === null ? "—" : deliveryFee === 0 ? t("Free") : money(deliveryFee)}</span>
            </div>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-bold text-slate-900">
            <span>{t("Total")}</span>
            <span>{money(total)}</span>
          </div>
          {/* Another currency: say the rate, and that the order itself is in US dollars */}
          {currency !== "USD" && (
            <p className="text-xs text-slate-500">
              {t("Converted at 1 USD = {rate} {currency}. The order is saved in US dollars: {usd}.", {
                rate: rate.toLocaleString(locale),
                currency,
                usd: formatMoney(total, "USD", 1, locale),
              })}
            </p>
          )}
          <p className="text-xs text-slate-500">{t("The final total is calculated by the server from the current prices.")}</p>

          {placeOrder.error instanceof ApiError && placeOrder.error.code === "INSUFFICIENT_STOCK" ? (
            <p className="alert-danger">
              {t("Some items are no longer available ({reason}). Adjust quantities and try again.", { reason: placeOrder.error.message })}
            </p>
          ) : (
            placeOrder.isError && (
              <p className="alert-danger">
                {t("Could not place the order.")} {placeOrder.error.message}
              </p>
            )
          )}

          <button type="submit" form="checkout" disabled={placeOrder.isPending} className="btn btn-primary w-full py-2.5">
            {placeOrder.isPending ? t("Placing order...") : t("Place order")}
          </button>
        </div>
      </div>
    </div>
  );
}
