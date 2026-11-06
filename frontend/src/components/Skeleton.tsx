import type { ReactNode } from "react";

// Grey placeholder shapes shown while data is loading, in the shape of what is coming,
// so the page doesn't jump when the data arrives. Screen readers hear "Loading...".

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-slate-200/80 motion-safe:animate-pulse ${className}`} />;
}

function Loading({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">Loading...</span>
      {children}
    </div>
  );
}

// Product cards, like the ones on the Products page.
export function ProductCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Loading className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card flex gap-4 p-4">
          <Skeleton className="h-24 w-24 shrink-0" />
          <div className="flex-1 space-y-2.5 py-1">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </Loading>
  );
}

// Rows of a table or a list (admin pages, orders, reviews).
export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Loading className="card divide-y divide-slate-100">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-10 w-10 shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-24 sm:block" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </Loading>
  );
}

// One product page: the photo and the details next to it.
export function ProductDetailSkeleton() {
  return (
    <Loading className="card flex flex-col gap-8 p-6 sm:p-8 md:flex-row">
      <Skeleton className="aspect-square w-full md:w-96 md:shrink-0" />
      <div className="flex-1 space-y-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-36" />
      </div>
    </Loading>
  );
}

// A form card (the product form).
export function FormSkeleton() {
  return (
    <Loading className="card mx-auto max-w-2xl space-y-5 p-6 sm:p-8">
      <Skeleton className="h-7 w-48" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </Loading>
  );
}

// The admin dashboard: four number tiles and two big cards.
export function DashboardSkeleton() {
  return (
    <Loading className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card space-y-3 p-5">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </Loading>
  );
}
