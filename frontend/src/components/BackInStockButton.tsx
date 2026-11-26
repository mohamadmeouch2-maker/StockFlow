import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { stockAlertsApi } from "../api/stockAlerts";
import { useT } from "../i18n/useT";
import { useToast } from "../toast/useToast";

// "Tell me when it's back" on a sold-out product (customers). When an admin restocks it, the
// server tells the customer with the bell and an email. Until then they can change their mind.
export function BackInStockButton({ productId }: { productId: number }) {
  const { t } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["stock-alerts"], queryFn: stockAlertsApi.list });
  const waiting = list.data?.includes(productId) ?? false;
  const change = useMutation({
    mutationFn: (wait: boolean) => (wait ? stockAlertsApi.add(productId) : stockAlertsApi.remove(productId)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stock-alerts"] }),
    onError: (err) => {
      toast(err.message, "error"); // e.g. it was restocked a moment ago: "you can buy it now"
      qc.invalidateQueries({ queryKey: ["product", productId] });
    },
  });
  if (list.isLoading) return null;

  return waiting ? (
    <div className="flex flex-wrap items-center gap-3">
      <p className="rounded-lg bg-success-50 px-3 py-2 text-sm font-medium text-success-700">
        <span aria-hidden="true">🔔 </span>
        {t("We'll tell you when it's back: a notification and an email.")}
      </p>
      <button
        type="button"
        onClick={() => change.mutate(false)}
        disabled={change.isPending}
        className="text-sm font-medium text-slate-500 hover:text-slate-700 hover:underline"
      >
        {t("Don't tell me")}
      </button>
    </div>
  ) : (
    <button type="button" onClick={() => change.mutate(true)} disabled={change.isPending} className="btn btn-primary self-start px-6 py-2.5">
      <span aria-hidden="true">🔔</span>
      {t("Tell me when it's back")}
    </button>
  );
}
