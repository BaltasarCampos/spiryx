import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// RTL auto-cleanup requires a global afterEach which Vitest does not expose
// unless globals:true is set in vitest.config.ts. Call it explicitly here.
afterEach(() => {
	cleanup();
});
