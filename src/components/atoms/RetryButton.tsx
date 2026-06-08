import type { ButtonHTMLAttributes } from "react";

interface RetryButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  busyLabel?: string;
  label?: string;
  isBusy?: boolean;
}

export function RetryButton({
  busyLabel = "Trying again...",
  label = "Try again",
  isBusy = false,
  type = "button",
  disabled,
  className = "",
  ...buttonProps
}: RetryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isBusy}
      className={[
        "inline-flex items-center justify-center rounded-full bg-tide px-4 py-2 text-sm font-semibold text-white",
        "transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tide",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
      {...buttonProps}
    >
      {isBusy ? busyLabel : label}
    </button>
  );
}
