import { type ReactNode } from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`size-6 animate-spin rounded-full border-2 border-stone-200 border-t-brand-600 ${className}`}
      role="status"
      aria-label="Загрузка"
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex justify-center py-28">
      <Spinner />
    </div>
  );
}

export function Alert({
  kind = "error",
  children,
}: {
  kind?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles = {
    error: "bg-red-50 text-red-700 ring-red-600/15",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    info: "bg-brand-50 text-brand-800 ring-brand-600/15",
  }[kind];
  return (
    <div className={`rounded-2xl px-4 py-3 text-sm ring-1 ${styles}`}>
      {children}
    </div>
  );
}
