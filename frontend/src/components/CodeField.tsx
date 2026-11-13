import type { ReactNode, Ref } from "react";

type Props = { value: string; onChange: (code: string) => void; onBlur?: () => void; error?: ReactNode; ref?: Ref<HTMLInputElement> };

// The box for the 6-digit code from an email ("Check your email" and "Reset your password").
// Digits only: "482 913" pasted from the email becomes "482913".
export function CodeField({ value, onChange, onBlur, error, ref }: Props) {
  return (
    <div>
      <label htmlFor="code" className="label">
        Code
      </label>
      <input
        id="code"
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onBlur={onBlur}
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
          {error}
        </p>
      )}
    </div>
  );
}
