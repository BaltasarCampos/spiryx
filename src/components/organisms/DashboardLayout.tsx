import type { PropsWithChildren } from "react";

export function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-2xl border border-cyan-100 bg-white/80 p-4 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tide">Air Conditions</p>
      </header>
      <main className="flex-1 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-8">
        {children}
      </main>
    </div>
  );
}
