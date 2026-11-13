import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { CodeField } from "../components/CodeField";
import { FormField } from "../components/FormField";
import { LogoMark } from "../components/Logo";
import { useCountdown } from "../hooks/useCountdown";
import { useToast } from "../toast/useToast";
import { passwordRule } from "../utils/validation";

const WAIT_SECONDS = 60; // the API sends a new code at most once a minute

// The same rules as the API (and as Register), so most mistakes are shown before sending.
const schema = z
  .object({
    code: z.string().regex(/^\d{6}$/, "Enter the 6 digits from the email"),
    password: passwordRule,
    repeatPassword: z.string(),
  })
  .refine((v) => v.repeatPassword === v.password, { message: "The two passwords are not the same", path: ["repeatPassword"] });
type FormValues = z.infer<typeof schema>;

// "Forgot password?", step 2: the 6-digit code from the email and a new password.
// The right code changes the password and logs the user in.
// /reset-password?email=sara@mail.com&sent=1   (sent=1: a code was just asked for, so "Send a new code" waits a minute)
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [wait, setWait] = useCountdown(params.get("sent") === "1" ? WAIT_SECONDS : 0);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    control,
    register,
    handleSubmit,
    setError,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { code: "", password: "", repeatPassword: "" } });

  if (!email) return <Navigate to="/forgot-password" replace />;

  const onSubmit = async (v: FormValues) => {
    setServerError("");
    try {
      const session = await authApi.resetPassword(email, v.code, v.password);
      startSession(session);
      toast(`Your password is changed. Welcome back, ${session.user.name}!`);
      navigate(session.user.role === "ADMIN" ? "/admin" : "/products", { replace: true });
    } catch (err) {
      // A wrong or old code goes under the Code box, a weak password under the password; anything else in a red box.
      const mine = err instanceof ApiError ? err.details.filter((d) => d.field === "code" || d.field === "password") : [];
      mine.forEach((d) => setError(d.field as "code" | "password", { message: d.message }));
      if (!mine.length) setServerError(err instanceof Error ? err.message : "Could not change the password");
    }
  };

  const sendNewCode = async () => {
    setSending(true);
    setServerError("");
    try {
      await authApi.forgotPassword(email);
      resetField("code"); // the old code stops working
      setWait(WAIT_SECONDS);
      toast(`If an account uses ${email}, we sent it a new code.`, "info");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not send a new code");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mx-auto max-w-md space-y-5 p-8">
      <div className="space-y-2 text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="page-title">Reset your password</h1>
        <p className="text-sm text-slate-600">
          If an account uses <span className="font-medium break-all text-slate-900">{email}</span>, we sent it a 6-digit code.
        </p>
        <p className="text-xs text-slate-500">Can't find it? Look in Spam or Junk. A code works for 15 minutes.</p>
      </div>
      <Controller
        name="code"
        control={control}
        render={({ field }) => <CodeField ref={field.ref} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={errors.code?.message} />}
      />
      <div>
        <FormField id="password" label="New password" type="password" autoComplete="new-password" {...register("password")} error={errors.password?.message} />
        <p className="mt-1 text-xs text-slate-500">At least 8 characters, with a letter and a number.</p>
      </div>
      <FormField
        id="repeatPassword"
        label="Repeat the new password"
        type="password"
        autoComplete="new-password"
        {...register("repeatPassword")}
        error={errors.repeatPassword?.message}
      />
      {serverError && <p className="alert-danger">{serverError}</p>}
      <button disabled={isSubmitting} className="btn btn-primary w-full py-2.5">
        {isSubmitting ? "Saving..." : "Save new password"}
      </button>
      <div className="space-y-1 text-center text-sm text-slate-600">
        <p>
          Didn't get the email?{" "}
          <button
            type="button"
            onClick={sendNewCode}
            disabled={wait > 0 || sending}
            className="link disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
          >
            {wait > 0 ? `Send a new code in ${wait}s` : sending ? "Sending..." : "Send a new code"}
          </button>
        </p>
        <p>
          Wrong email?{" "}
          <Link to="/forgot-password" className="link">
            Try another one
          </Link>
        </p>
      </div>
    </form>
  );
}
