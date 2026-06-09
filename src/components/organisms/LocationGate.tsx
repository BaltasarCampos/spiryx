import type { ReactNode } from "react";
import type { PermissionStatus } from "../../types/location";
import { RetryButton } from "../atoms/RetryButton";
import { StatusPanel } from "../molecules/StatusPanel";

interface LocationGateProps {
  children: ReactNode;
  errorMessage: string | null;
  isLoading: boolean;
  onRetry: () => void;
  permissionStatus: PermissionStatus;
}

/**
 * Guards the dashboard content behind geolocation permission.
 *
 * - Loading: show a neutral status panel.
 * - Denied / Unavailable: show an error panel with retry guidance (no manual
 *   location input is offered per spec).
 * - Granted / Prompt (not loading): render children.
 */
export function LocationGate({
  children,
  errorMessage,
  isLoading,
  onRetry,
  permissionStatus,
}: LocationGateProps) {
  if (isLoading) {
    return (
      <StatusPanel
        tone="loading"
        title="Checking your location"
        message="Waiting for location permission to load local air quality."
      />
    );
  }

  if (permissionStatus === "denied") {
    return (
      <StatusPanel
        tone="error"
        title="Location access denied"
        message={errorMessage ?? "Enable location in your browser settings, then retry."}
        details={
          <p>
            Open your browser settings, allow location access for this site, and click{" "}
            <strong>Try again</strong>.
          </p>
        }
        action={<RetryButton onClick={onRetry} />}
      />
    );
  }

  if (permissionStatus === "unavailable") {
    return (
      <StatusPanel
        tone="warning"
        title="Location unavailable"
        message={errorMessage ?? "Your location could not be determined right now."}
        details={<p>Check your device location settings and try again.</p>}
        action={<RetryButton onClick={onRetry} />}
      />
    );
  }

  return <>{children}</>;
}
