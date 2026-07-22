import type { PropsWithChildren } from "react";

export function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <a
        href="#main-content"
        className={[
          "sr-only focus:not-sr-only",
          "focus:absolute focus:left-4 focus:top-4 focus:z-50",
          "focus:rounded-full focus:bg-tide focus:px-4 focus:py-2",
          "focus:text-sm focus:font-semibold focus:text-white",
          "focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-tide",
        ].join(" ")}
      >
        Skip to main content
      </a>
 
      <header className="mb-8 rounded-2xl border border-cyan-100 bg-white/80 p-4 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tide">
          Air Conditions
        </p>
      </header>
 
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-8"
      >
        {children}
      </main>
    </div>
  );
}
 