import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { msg } from "../i18n/core";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { CodeField } from "../components/CodeField";
import { FormField } from "../components/FormField";
import { LogoMark } from "../components/Logo";
import { useCountdown } from "../hooks/useCountdown";
import { useToast } from "../toast/useToast";
import { passwordRule } from "../utils/validation";
import { useT } from "../i18n/useT";
import { tx } from "../i18n/core";

const WAIT_SECONDS = 60; // the API sends a new code at most once a minute

// The same rules as the API (and as Register), so most mistakes are shown before sending.
const schema = z
  .object({
    code: z.string().regex(/^\d{6}$/, msg("Enter the 6 digits from the email")),
    password: passwordRule,
    repeatPassword: z.string(),
  })
  .refine((v) => v.repeatPassword === v.password, { message: msg("The two passwords are not the same"), path: ["repeatPassword"] });
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
  const { t } = useT();
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
      toast(t("Your password is changed. Welcome back, {name}!", { name: session.user.name }));
      navigate(session.user.role === "ADMIN" ? "/admin" : "/products", { replace: true });
    } catch (err) {
      // A wrong or old code goes under the Code box, a weak password under the password; anything else in a red box.
      const mine = err instanceof ApiError ? err.details.filter((d) => d.field === "code" || d.field === "password") : [];
      mine.forEach((d) => setError(d.field as "code" | "password", { message: d.message }));
      if (!mine.length) setServerError(err instanceof Error ? err.message : t("Could not change the password"));
    }
  };

  const sendNewCode = async () => {
    setSending(true);
    setServerError("");
    try {
      await authApi.forgotPassword(email);
      resetField("code"); // the old code stops working
      setWait(WAIT_SECONDS);
      toast(t("If an account uses {email}, we sent it a new code.", { email }), "info");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("Could not send a new code"));
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mx-auto max-w-md space-y-5 p-8">
      <div className="space-y-2 text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="page-title">{t("Reset your password")}</h1>
        <p className="text-sm text-slate-600">
          {tx("If an account uses {email}, we sent it a 6-digit code.", {
            email: (
              <span key="email" className="font-medium break-all text-slate-900">
                {email}
              </span>
            ),
          })}
        </p>
        <p className="text-xs text-slate-500">{t("Can't find it? Look in Spam or Junk. A code works for 15 minutes.")}</p>
      </div>
      <Controller
        name="code"
        control={control}
        render={({ field }) => <CodeField ref={field.ref} value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={errors.code?.message} />}
      />
      <div>
        <FormField
          id="password"
          label={t("New password")}
          type="password"
          autoComplete="new-password"
          {...register("password")}
          error={errors.password?.message}
        />
        <p className="mt-1 text-xs text-slate-500">{t("At least 8 characters, with a letter and a number.")}</p>
      </div>
      <FormField
        id="repeatPassword"
        label={t("Repeat the new password")}
        type="password"
        autoComplete="new-password"
        {...register("repeatPassword")}
        error={errors.repeatPassword?.message}
      />
      {serverError && <p className="alert-danger">{serverError}</p>}
      <button disabled={isSubmitting} className="btn btn-primary w-full py-2.5">
        {isSubmitting ? t("Saving...") : t("Save new password")}
      </button>
      <div className="space-y-1 text-center text-sm text-slate-600">
        <p>
          {t("Didn't get the email?")}{" "}
          <button
            type="button"
            onClick={sendNewCode}
            disabled={wait > 0 || sending}
            className="link disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
          >
            {wait > 0 ? t("Send a new code in {count}s", { count: wait }) : sending ? t("Sending...") : t("Send a new code")}
          </button>
        </p>
        <p>
          {t("Wrong email?")}{" "}
          <Link to="/forgot-password" className="link">
            {t("Try another one")}
          </Link>
        </p>
      </div>
    </form>
  );
}
