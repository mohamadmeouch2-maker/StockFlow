import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { LogoMark } from "../components/Logo";
import { useToast } from "../toast/useToast";

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
  const [code, setCode] = useState("");
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [wait, setWait] = useState(justSent ? WAIT_SECONDS : 0); // seconds until "Send a new code" works

  // Count down one second at a time.
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const showError = (err: Error) => setError({ code: err instanceof ApiError ? err.code : "", message: err.message });

  const verify = useMutation({
    mutationFn: () => authApi.verifyEmail(email, code),
    onSuccess: (session) => {
      startSession(session);
      toast(`Welcome to StockFlow, ${session.user.name}! Your email is verified.`);
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
      toast(`We sent a new code to ${email}`, "info");
    },
    onError: showError,
  });

  if (!email) return <Navigate to="/register" replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return setError({ code: "", message: "Enter the 6 digits from the email" });
    setError(null);
    verify.mutate();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="card mx-auto max-w-md space-y-5 p-8">
      <div className="space-y-2 text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="page-title">Check your email</h1>
        <p className="text-sm text-slate-600">
          {justSent ? "We sent a 6-digit code to" : "Your email is not verified yet. Type the 6-digit code we sent to"}{" "}
          <span className="font-medium break-all text-slate-900">{email}</span>
        </p>
        <p className="text-xs text-slate-500">Can't find it? Look in Spam or Junk. A code works for 15 minutes.</p>
      </div>
      <div>
        <label htmlFor="code" className="label">
          Code
        </label>
        <input
          id="code"
          value={code}
          // Digits only: "482 913" pasted from the email becomes "482913"
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "code-error" : undefined}
          className="input text-center text-2xl font-semibold tracking-[0.5em] placeholder:text-slate-300"
        />
        {error && (
          <p id="code-error" className="field-error">
            {error.message}{" "}
            {error.code === "ALREADY_VERIFIED" && (
              <Link to="/login" className="link">
                Log in
              </Link>
            )}
          </p>
        )}
      </div>
      <button disabled={verify.isPending} className="btn btn-primary w-full py-2.5">
        {verify.isPending ? "Checking..." : "Verify email"}
      </button>
      <div className="space-y-1 text-center text-sm text-slate-600">
        <p>
          Didn't get the email?{" "}
          <button
            type="button"
            onClick={() => resend.mutate()}
            disabled={wait > 0 || resend.isPending}
            className="link disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
          >
            {wait > 0 ? `Send a new code in ${wait}s` : resend.isPending ? "Sending..." : "Send a new code"}
          </button>
        </p>
        <p>
          Wrong email?{" "}
          <Link to="/register" className="link">
            Register again
          </Link>
        </p>
      </div>
    </form>
  );
}
