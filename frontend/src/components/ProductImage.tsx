import { useState } from "react";
import { CORE_API } from "../api/client";

type Props = { src?: string | null; alt: string; className?: string };

// FR-17: a product's photo, or a neutral placeholder when it has none (or the file can't be loaded).
// Give it a size with className, e.g. "h-12 w-12" or "aspect-square w-full".
export function ProductImage({ src, alt, className = "" }: Props) {
  const [failedSrc, setFailedSrc] = useState<string>();

  if (!src || failedSrc === src)
    return (
      <div role="img" aria-label={`${alt}: no photo`} className={`flex items-center justify-center rounded bg-slate-100 text-slate-300 ${className}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-1/2 w-1/2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="m21 16-5-5-9 9" />
        </svg>
      </div>
    );

  return (
    <img
      src={`${CORE_API}${src}`}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className={`rounded bg-white object-contain ${className}`} // the whole product, never cut off
    />
  );
}
