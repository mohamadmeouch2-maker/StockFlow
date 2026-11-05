import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import { FormField } from "../components/FormField";

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: FormValues) => {
    setServerError("");
    try {
      const user = await login(v.email, v.password);
      navigate(from ?? (user.role === "ADMIN" ? "/admin/products" : "/products"), { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Log in</h1>
      <FormField id="email" label="Email" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
      <FormField id="password" label="Password" type="password" autoComplete="current-password" {...register("password")} error={errors.password?.message} />
      {serverError && <p className="text-red-600">{serverError}</p>}
      <button disabled={isSubmitting} className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {isSubmitting ? "Logging in..." : "Log in"}
      </button>
      <p className="text-sm">
        No account?{" "}
        <Link to="/register" className="text-blue-600 hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}
