import type { ReactNode } from "react";

type StatusTone = "error" | "info" | "loading" | "warning";

interface StatusPanelProps {
  action?: ReactNode;
  details?: ReactNode;
  message: string;
  title: string;
  tone?: StatusTone;
}

const TONE_STYLES: Record<StatusTone, string> = {
  error: "border-rose-200 bg-rose-50 text-rose-950",
  info: "border-cyan-200 bg-cyan-50 text-cyan-950",
  loading: "border-slate-200 bg-slate-50 text-slate-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
};

export function StatusPanel({
  action,
  details,
  message,
  title,
  tone = "info",
}: StatusPanelProps) {
  const liveRole = tone === "error" || tone === "warning" ? "alert" : "status";

  return (
    <section
      role={liveRole}
      aria-live="polite"
      className={`space-y-3 rounded-2xl border p-4 shadow-sm ${TONE_STYLES[tone]}`}
    >
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm leading-6">{message}</p>
      </div>
      {details ? <div className="text-sm leading-6 opacity-90">{details}</div> : null}
      {action ? <div>{action}</div> : null}
    </section>
  );
}