import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// RTL auto-cleanup requires a global afterEach which Vitest does not expose
// unless globals:true is set in vitest.config.ts. Call it explicitly here.
afterEach(() => {
	cleanup();
});

// jsdom does not implement ResizeObserver, which Recharts' ResponsiveContainer
// requires. A no-op stub is enough: chart dimensions are irrelevant in tests,
// which assert on the accessible table fallback instead of the SVG.
if (typeof globalThis.ResizeObserver === "undefined") {
	class ResizeObserverStub {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	}
	globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
