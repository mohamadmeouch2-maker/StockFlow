// The StockFlow logo: a white box (stock) on a blue tile. Also used as public/favicon.svg.
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#2563eb" />
      <g fill="none" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M18 24 32 17l14 7v16l-14 7-14-7Z" />
        <path d="m18 24 14 7 14-7M32 31v16" />
      </g>
    </svg>
  );
}
