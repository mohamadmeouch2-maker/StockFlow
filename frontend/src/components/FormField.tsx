import type { ComponentProps } from "react";

// ComponentProps<"input"> includes `ref`, so react-hook-form's register() can be spread in.
type Props = ComponentProps<"input"> & { id: string; label: string; error?: string };

// A label, an input and its red error message (NFR-10: every field has a label).
export function FormField({ id, label, error, ...input }: Props) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input id={id} {...input} className="w-full rounded border bg-white px-3 py-2" />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
