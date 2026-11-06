import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import { FormField } from "../components/FormField";
import { LogoMark } from "../components/Logo";
import { useToast } from "../toast/useToast";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
type FormValues = z.infer<typeof schema>;

// FR-02: log in. Afterwards go back to the page that asked for a login, or to a sensible home.
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: { pathname: string } } | null)?.from?.pathname;
  const [serverError, setServerError] = useState("");
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: FormValues) => {
    setServerError("");
    try {
      const user = await login(v.email, v.password);
      toast(`Welcome back, ${user.name}!`);
      navigate(from ?? (user.role === "ADMIN" ? "/admin" : "/products"), { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card mx-auto max-w-md space-y-5 p-8">
      <div className="space-y-2 text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="page-title">Welcome back</h1>
        <p className="text-sm text-slate-500">Log in to order products and follow your orders.</p>
      </div>
      <FormField id="email" label="Email" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
      <FormField id="password" label="Password" type="password" autoComplete="current-password" {...register("password")} error={errors.password?.message} />
      {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}
      <button disabled={isSubmitting} className="btn btn-primary w-full py-2.5">
        {isSubmitting ? "Logging in..." : "Log in"}
      </button>
      <p className="text-center text-sm text-slate-600">
        No account?{" "}
        <Link to="/register" className="link">
          Register
        </Link>
      </p>
    </form>
  );
}
