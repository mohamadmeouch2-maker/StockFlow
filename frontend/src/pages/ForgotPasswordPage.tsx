import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { authApi } from "../api/auth";
import { FormField } from "../components/FormField";
import { LogoMark } from "../components/Logo";

const schema = z.object({ email: z.string().trim().email("Enter a valid email") });
type FormValues = z.infer<typeof schema>;

// "Forgot password?", step 1: the email of the account. The API emails it a 6-digit code,
// and the next page (Reset your password) asks for the code and a new password.
// /forgot-password?email=sara@mail.com   (the login page passes the email that was already typed)
export function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: params.get("email") ?? "" } });

  const onSubmit = async (v: FormValues) => {
    setServerError("");
    const email = v.email.trim().toLowerCase();
    try {
      await authApi.forgotPassword(email);
      navigate(`/reset-password?email=${encodeURIComponent(email)}&sent=1`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not send the code");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mx-auto max-w-md space-y-5 p-8">
      <div className="space-y-2 text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="page-title">Forgot your password?</h1>
        <p className="text-sm text-slate-500">Type the email of your account. We'll send you a 6-digit code to choose a new password.</p>
      </div>
      <FormField id="email" label="Email" type="email" autoComplete="email" autoFocus {...register("email")} error={errors.email?.message} />
      {serverError && <p className="alert-danger">{serverError}</p>}
      <button disabled={isSubmitting} className="btn btn-primary w-full py-2.5">
        {isSubmitting ? "Sending..." : "Send me a code"}
      </button>
      <p className="text-center text-sm text-slate-600">
        Remembered it?{" "}
        <Link to="/login" className="link">
          Log in
        </Link>
      </p>
    </form>
  );
}
