import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { FormField } from "../components/FormField";

// FR-01: the same rules as the API, so most mistakes are shown before sending.
const schema = z.object({
  name: z.string().trim().min(2, "At least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").regex(/[A-Za-z]/, "Needs a letter").regex(/\d/, "Needs a number"),
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

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
      navigate("/products", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError("email", { message: "This email is already registered" });
      else if (err instanceof ApiError && err.details.length) err.details.forEach((d) => setError(d.field as keyof FormValues, { message: d.message }));
      else setServerError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Create an account</h1>
      <FormField id="name" label="Name" autoComplete="name" {...register("name")} error={errors.name?.message} />
      <FormField id="email" label="Email" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
      <FormField id="password" label="Password" type="password" autoComplete="new-password" {...register("password")} error={errors.password?.message} />
      <p className="text-xs text-gray-500">At least 8 characters, with a letter and a number.</p>
      {serverError && <p className="text-red-600">{serverError}</p>}
      <button disabled={isSubmitting} className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {isSubmitting ? "Creating account..." : "Register"}
      </button>
      <p className="text-sm">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
