import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { FormField } from "../components/FormField";
import { LogoMark } from "../components/Logo";
import { useToast } from "../toast/useToast";
import { nameRule, passwordRule } from "../utils/validation";

// FR-01: the same rules as the API, so most mistakes are shown before sending.
const schema = z.object({
  name: nameRule,
  email: z.string().email("Enter a valid email"),
  password: passwordRule,
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const toast = useToast();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: FormValues) => {
    setServerError("");
    try {
      await api("core", "/api/auth/register", { method: "POST", body: JSON.stringify(v) });
      await login(v.email, v.password); // log straight in after registering
      toast(`Welcome to StockFlow, ${v.name}!`);
      navigate("/products", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError("email", { message: "This email is already registered" });
      else if (err instanceof ApiError && err.details.length) err.details.forEach((d) => setError(d.field as keyof FormValues, { message: d.message }));
      else setServerError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card mx-auto max-w-md space-y-5 p-8">
      <div className="space-y-2 text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="page-title">Create an account</h1>
        <p className="text-sm text-slate-500">It takes less than a minute.</p>
      </div>
      <FormField id="name" label="Name" autoComplete="name" {...register("name")} error={errors.name?.message} />
      <FormField id="email" label="Email" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
      <div>
        <FormField id="password" label="Password" type="password" autoComplete="new-password" {...register("password")} error={errors.password?.message} />
        <p className="mt-1 text-xs text-slate-500">At least 8 characters, with a letter and a number.</p>
      </div>
      {serverError && <p className="alert-danger">{serverError}</p>}
      <button disabled={isSubmitting} className="btn btn-primary w-full py-2.5">
        {isSubmitting ? "Creating account..." : "Register"}
      </button>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link to="/login" className="link">
          Log in
        </Link>
      </p>
    </form>
  );
}
