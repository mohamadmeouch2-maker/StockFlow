import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ApiError } from "../api/client";
import { ordersApi } from "../api/orders";
import { SUPPORT_TOPICS, supportApi, topicLabel, type NewSupportMessage } from "../api/support";
import type { SupportTicket, SupportTopic } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { FormField } from "../components/FormField";
import { RowsSkeleton } from "../components/Skeleton";
import { SupportConversation } from "../components/SupportConversation";
import { useToast } from "../toast/useToast";
import { nameRule } from "../utils/validation";

const isTopic = (v: string | null): v is SupportTopic => SUPPORT_TOPICS.some((t) => t.value === v);

// The same rules as the API, so most mistakes are shown before sending.
const schema = z.object({
  topic: z.string().refine((v) => SUPPORT_TOPICS.some((t) => t.value === v), "Choose a topic"),
  orderId: z.string(), // "" = no specific order
  name: z.string(),
  email: z.string(),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(2000, "At most 2000 characters"),
});
// Visitors who are not logged in also give a name and an email: that is where the answer goes.
const visitorSchema = schema.extend({ name: nameRule, email: z.string().trim().email("Enter a valid email") });
type FormValues = z.infer<typeof schema>;
const empty: FormValues = { topic: "", orderId: "", name: "", email: "", message: "" };

// Customer service (/help): help with signing in, orders, delivery, returns, payments and cards, or changes.
// Everyone can write, also visitors who can't log in. Customers see their conversations under "My messages".
// /help?topic=ORDER&order=12  (from My orders: the topic and the order are already chosen)
export function CustomerServicePage() {
  const { user } = useAuth();

  if (user?.role === "ADMIN")
    return (
      <div className="card mx-auto max-w-xl space-y-3 p-8 text-center">
        <h1 className="page-title">Customer service</h1>
        <p className="text-sm text-slate-600">You are logged in as an admin. The customers' messages are on your Customer service page.</p>
        <Link to="/admin/support" className="btn btn-primary">
          Open the customers' messages
        </Link>
      </div>
    );

  const customer = user?.role === "CUSTOMER";
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="page-title">Customer service</h1>
        <p className="text-sm text-slate-500">
          Questions about signing in, an order, delivery, returns, payments and cards, or changes? Write to us. We answer as soon as we can.
        </p>
      </div>
      <QuickHelp />
      {/* key: logging in or out starts a fresh form with the right fields */}
      <ContactForm key={customer ? "customer" : "visitor"} customer={customer} />
      {customer && <MyConversations />}
    </div>
  );
}

// Answers people can find themselves, before writing
function QuickHelp() {
  const tips = [
    {
      icon: "🔑",
      title: "Can't sign in?",
      text: "Choose a new password with a code sent to your email.",
      link: "/forgot-password",
      action: "Forgot password?",
    },
    {
      icon: "🚚",
      title: "Where is my order? Changed your mind?",
      text: "My orders shows each step (pending, shipped, delivered), and you can cancel an order yourself while it is still pending.",
      link: "/orders",
      action: "My orders",
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tips.map((t) => (
        <div key={t.title} className="card space-y-1 p-4 text-sm">
          <p className="font-semibold text-slate-900">
            <span aria-hidden="true">{t.icon} </span>
            {t.title}
          </p>
          <p className="text-slate-600">{t.text}</p>
          <Link to={t.link} className="link">
            {t.action}
          </Link>
        </div>
      ))}
    </div>
  );
}

function ContactForm({ customer }: { customer: boolean }) {
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [sent, setSent] = useState<SupportTicket | null>(null); // visitors: "We got your message"
  const [serverError, setServerError] = useState("");
  const orders = useQuery({ queryKey: ["orders", "mine"], queryFn: ordersApi.mine, enabled: customer });

  const startTopic = params.get("topic");
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(customer ? schema : visitorSchema),
    defaultValues: { ...empty, topic: isTopic(startTopic) ? startTopic : "", orderId: customer ? (params.get("order") ?? "") : "" },
  });
  const topic = useWatch({ control, name: "topic" });
  const example = SUPPORT_TOPICS.find((t) => t.value === topic)?.example ?? "Choose a topic, then write your question here.";

  const onSubmit = async (v: FormValues) => {
    setServerError("");
    const body: NewSupportMessage = {
      topic: v.topic as SupportTopic,
      message: v.message.trim(),
      ...(customer ? (v.orderId ? { orderId: Number(v.orderId) } : {}) : { name: v.name.trim(), email: v.email.trim().toLowerCase() }),
    };
    try {
      const ticket = await supportApi.create(body);
      if (customer) {
        toast("Message sent. Our answer will appear below, under My messages.");
        reset(empty);
        qc.invalidateQueries({ queryKey: ["support", "mine"] });
      } else setSent(ticket);
    } catch (err) {
      // A message for one field goes under that field; anything else in a red box
      const fields = Object.keys(empty);
      const mine = err instanceof ApiError ? err.details.filter((d) => fields.includes(d.field)) : [];
      mine.forEach((d) => setError(d.field as keyof FormValues, { message: d.message }));
      if (!mine.length) setServerError(err instanceof Error ? err.message : "Could not send the message");
    }
  };

  if (sent)
    return (
      <div role="status" className="card space-y-3 p-8 text-center">
        <p className="text-4xl" aria-hidden="true">
          ✉️
        </p>
        <h2 className="text-lg font-semibold text-slate-900">Thanks, {sent.name}! We got your message.</h2>
        <p className="text-sm text-slate-600">
          It is about <b>{topicLabel(sent.topic)}</b>. We will answer by email at <b className="break-all">{sent.email}</b> (look in Spam or Junk too).
        </p>
        <button
          onClick={() => {
            setSent(null);
            reset(empty);
          }}
          className="btn btn-outline"
        >
          Write another message
        </button>
      </div>
    );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-4 p-6">
      <div>
        <h2 className="font-semibold text-slate-900">
          <span aria-hidden="true">✉️ </span>Write to us
        </h2>
        {!customer && (
          <p className="text-sm text-slate-500">
            Have an account?{" "}
            <Link to="/login" state={{ from: { pathname: "/help" } }} className="link">
              Log in
            </Link>{" "}
            to choose an order and see our answers here. Can't log in? Just write to us below.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="topic" className="label">
            Topic
          </label>
          <select id="topic" {...register("topic")} aria-invalid={errors.topic ? true : undefined} className="input">
            <option value="">Select a topic</option>
            {SUPPORT_TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {errors.topic && <p className="field-error">{errors.topic.message}</p>}
        </div>
        {/* Shown once the orders are loaded, so an order chosen in the address (?order=12) is selected */}
        {customer && orders.data && orders.data.length > 0 && (
          <div>
            <label htmlFor="orderId" className="label">
              Order (optional)
            </label>
            <select id="orderId" {...register("orderId")} className="input">
              <option value="">No specific order</option>
              {orders.data.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  #{o.id} · {new Date(o.createdAt).toLocaleDateString()} · {o.status.charAt(0) + o.status.slice(1).toLowerCase()} · $
                  {Number(o.total).toFixed(2)}
                </option>
              ))}
            </select>
            {errors.orderId && <p className="field-error">{errors.orderId.message}</p>}
          </div>
        )}
      </div>

      {!customer && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="name" label="Your name" autoComplete="name" {...register("name")} error={errors.name?.message} />
          <FormField id="email" label="Your email" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
        </div>
      )}

      <div>
        <label htmlFor="message" className="label">
          Message
        </label>
        <textarea
          id="message"
          rows={4}
          maxLength={2000}
          placeholder={example}
          {...register("message")}
          aria-invalid={errors.message ? true : undefined}
          className="input"
        />
        {errors.message && <p className="field-error">{errors.message.message}</p>}
      </div>

      {serverError && <p className="alert-danger">{serverError}</p>}
      <button disabled={isSubmitting} className="btn btn-primary">
        {isSubmitting ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}

// The customer's conversations, the most recent first. A new answer is marked "New reply" while the page is open.
function MyConversations() {
  const qc = useQueryClient();
  const tickets = useQuery({ queryKey: ["support", "mine"], queryFn: supportApi.mine });
  const [newIds, setNewIds] = useState<number[]>([]);

  // Seen: tell the API, so the number on the menu goes away. The "New reply" labels stay until the page is left.
  useEffect(() => {
    const fresh = tickets.data?.filter((t) => t.customerUnread).map((t) => t.id) ?? [];
    if (!fresh.length) return;
    supportApi
      .markRead()
      .then(() => {
        setNewIds((ids) => [...new Set([...ids, ...fresh])]);
        qc.invalidateQueries({ queryKey: ["support", "mine"] });
      })
      .catch(() => {}); // not important: it is tried again next time
  }, [tickets.data, qc]);

  return (
    <section aria-labelledby="my-messages" className="space-y-3">
      <h2 id="my-messages" className="text-lg font-semibold text-slate-900">
        My messages
      </h2>
      {tickets.isLoading && <RowsSkeleton rows={2} />}
      {tickets.isError && <p className="text-danger-600">Could not load your messages. {tickets.error.message}</p>}
      {tickets.data?.length === 0 && (
        <p className="card p-6 text-center text-sm text-slate-500">No messages yet. When you write to us, the conversation appears here.</p>
      )}
      {tickets.data?.map((t) => (
        <SupportConversation key={t.id} ticket={t} viewer="CUSTOMER" isNew={t.customerUnread || newIds.includes(t.id)} />
      ))}
    </section>
  );
}
