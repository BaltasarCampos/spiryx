/**
 * T021 – LocationGate component tests.
 *
 * Tests the three gate states (loading, denied, unavailable) and the
 * pass-through to children when permission is granted or prompt.
 * These tests will fail until LocationGate is implemented (T028).
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocationGate } from "../organisms/LocationGate";

const onRetry = vi.fn();
const childContent = <p>Dashboard content</p>;

describe("LocationGate – loading state", () => {
  it("renders a loading message and no children", () => {
    render(
      <LocationGate
        permissionStatus="prompt"
        isLoading={true}
        errorMessage={null}
        onRetry={onRetry}
      >
        {childContent}
      </LocationGate>,
    );
    expect(screen.getByText(/checking your location/i)).toBeInTheDocument();
    expect(screen.queryByText(/dashboard content/i)).not.toBeInTheDocument();
  });

  it("loading panel is not an error alert", () => {
    render(
      <LocationGate
        permissionStatus="prompt"
        isLoading={true}
        errorMessage={null}
        onRetry={onRetry}
      >
        {childContent}
      </LocationGate>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("LocationGate – permission denied state", () => {
  it("renders the denied heading", () => {
    render(
      <LocationGate
        permissionStatus="denied"
        isLoading={false}
        errorMessage="Location access was denied."
        onRetry={onRetry}
      >
        {childContent}
      </LocationGate>,
    );
    expect(screen.getByText(/location access denied/i)).toBeInTheDocument();
  });

  it("shows the error message from props", () => {
    render(
      <LocationGate
        permissionStatus="denied"
        isLoading={false}
        errorMessage="Custom denied message"
        onRetry={onRetry}
      >
        {childContent}
      </LocationGate>,
    );
    expect(screen.getByText("Custom denied message")).toBeInTheDocument();
  });

  it("renders a retry button", () => {
    render(
      <LocationGate
        permissionStatus="denied"
        isLoading={false}
        errorMessage={null}
        onRetry={onRetry}
      >
        {childContent}
      </LocationGate>,
    );
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls onRetry when the retry button is clicked", async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();
    render(
      <LocationGate
        permissionStatus="denied"
        isLoading={false}
        errorMessage={null}
        onRetry={handleRetry}
      >
        {childContent}
      </LocationGate>,
    );
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render children", () => {
    render(
      <LocationGate
        permissionStatus="denied"
        isLoading={false}
        errorMessage={null}
        onRetry={onRetry}
      >
        {childContent}
      </LocationGate>,
    );
    expect(screen.queryByText(/dashboard content/i)).not.toBeInTheDocument();
  });

  it("does not offer manual location input", () => {
    render(
      <LocationGate
        permissionStatus="denied"
        isLoading={false}
        errorMessage={null}
        onRetry={onRetry}
      >
        {childContent}
      </LocationGate>,
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/city|location|address/i)).not.toBeInTheDocument();
  });
});

describe("LocationGate – unavailable state", () => {
  it("renders the unavailable heading", () => {
    render(
      <LocationGate
        permissionStatus="unavailable"
        isLoading={false}
        errorMessage={null}
        onRetry={onRetry}
      >
        {childContent}
      </LocationGate>,
    );
    expect(screen.getByText(/location unavailable/i)).toBeInTheDocument();
  });

  it("renders a retry button", () => {
    render(
      <LocationGate
        permissionStatus="unavailable"
        isLoading={false}
        errorMessage={null}
        onRetry={onRetry}
      >
        {childContent}
      </LocationGate>,
    );
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not offer manual location input", () => {
    render(
      <LocationGate
        permissionStatus="unavailable"
        isLoading={false}
        errorMessage={null}
        onRetry={onRetry}
      >
        {childContent}
      </LocationGate>,
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("LocationGate – granted / prompt pass-through", () => {
  it("renders children when permissionStatus is 'granted'", () => {
    render(
      <LocationGate
        permissionStatus="granted"
        isLoading={false}
        errorMessage={null}
        onRetry={onRetry}
      >
        {childContent}
      </LocationGate>,
    );
    expect(screen.getByText(/dashboard content/i)).toBeInTheDocument();
  });

  it("renders children when permissionStatus is 'prompt' and not loading", () => {
    render(
      <LocationGate
        permissionStatus="prompt"
        isLoading={false}
        errorMessage={null}
        onRetry={onRetry}
      >
        {childContent}
      </LocationGate>,
    );
    expect(screen.getByText(/dashboard content/i)).toBeInTheDocument();
  });
});
