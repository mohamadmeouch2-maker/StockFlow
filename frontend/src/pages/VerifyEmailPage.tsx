import { msg } from "../i18n/core";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { CodeField } from "../components/CodeField";
import { LogoMark } from "../components/Logo";
import { useCountdown } from "../hooks/useCountdown";
import { useToast } from "../toast/useToast";
import { useT } from "../i18n/useT";
import { tx } from "../i18n/core";

const WAIT_SECONDS = 60; // the API sends a new code at most once a minute

// After Register: type the 6-digit code from the email. The right code verifies the email and logs in.
// /verify-email?email=sara@mail.com&sent=1   (sent=1: a code was just sent, so "Send a new code" waits a minute)
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const justSent = params.get("sent") === "1";
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useT();
  const [code, setCode] = useState("");
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [wait, setWait] = useCountdown(justSent ? WAIT_SECONDS : 0); // seconds until "Send a new code" works

  const showError = (err: Error) => setError({ code: err instanceof ApiError ? err.code : "", message: err.message });

  const verify = useMutation({
    mutationFn: () => authApi.verifyEmail(email, code),
    onSuccess: (session) => {
      startSession(session);
      toast(t("Welcome to StockFlow, {name}! Your email is verified.", { name: session.user.name }));
      navigate("/products", { replace: true });
    },
    onError: showError,
  });

  const resend = useMutation({
    mutationFn: () => authApi.resendCode(email),
    onSuccess: () => {
      setCode("");
      setError(null);
      setWait(WAIT_SECONDS);
      toast(t("We sent a new code to {email}", { email }), "info");
    },
    onError: showError,
  });

  if (!email) return <Navigate to="/register" replace />;

  const emailBox = (
    <span key="email" className="font-medium break-all text-slate-900">
      {email}
    </span>
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return setError({ code: "", message: msg("Enter the 6 digits from the email") });
    setError(null);
    verify.mutate();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="card mx-auto max-w-md space-y-5 p-8">
      <div className="space-y-2 text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="page-title">{t("Check your email")}</h1>
        <p className="text-sm text-slate-600">
          {justSent
            ? tx("We sent a 6-digit code to {email}", { email: emailBox })
            : tx("Your email is not verified yet. Type the 6-digit code we sent to {email}", { email: emailBox })}
        </p>
        <p className="text-xs text-slate-500">{t("Can't find it? Look in Spam or Junk. A code works for 15 minutes.")}</p>
      </div>
      <CodeField
        value={code}
        onChange={setCode}
        error={
          error && (
            <>
              {error.message}{" "}
              {error.code === "ALREADY_VERIFIED" && (
                <Link to="/login" className="link">
                  {t("Log in")}
                </Link>
              )}
            </>
          )
        }
      />
      <button disabled={verify.isPending} className="btn btn-primary w-full py-2.5">
        {verify.isPending ? t("Checking...") : t("Verify email")}
      </button>
      <div className="space-y-1 text-center text-sm text-slate-600">
        <p>
          {t("Didn't get the email?")}{" "}
          <button
            type="button"
            onClick={() => resend.mutate()}
            disabled={wait > 0 || resend.isPending}
            className="link disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
          >
            {wait > 0 ? t("Send a new code in {count}s", { count: wait }) : resend.isPending ? t("Sending...") : t("Send a new code")}
          </button>
        </p>
        <p>
          {t("Wrong email?")}{" "}
          <Link to="/register" className="link">
            {t("Register again")}
          </Link>
        </p>
      </div>
    </form>
  );
}
