#!/usr/bin/env node
/**
 * Coverage-gate.mjs
 *
 * Reads the Vitest coverage JSON summary and enforces:
 *  - 100% line/statement coverage for utility functions (src/utils/)
 *  - 80%+ line coverage for interactive components (src/components/)
 *
 * Usage:
 *   node scripts/coverage-gate.mjs
 *
 * Requires a completed `npm run test:coverage` (coverage/coverage-summary.json
 * must exist). Configure Vitest to emit JSON summary:
 *   coverage: { reporter: ["text", "json-summary"] }
 *
 * Exits 1 if any threshold is not met.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUMMARY_PATH = join(__dirname, "..", "coverage", "coverage-summary.json");

const THRESHOLDS = {
  utils: { lines: 100, label: "Utility functions (src/utils/)" },
  components: { lines: 80, label: "Interactive components (src/components/)" },
};

async function loadSummary() {
  try {
    const raw = await readFile(SUMMARY_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    console.error(
      "✗ coverage/coverage-summary.json not found.\n" +
      "  Run `npm run test:coverage` first and ensure vitest.config.ts includes:\n" +
      "  coverage: { reporter: [\"text\", \"json-summary\"] }",
    );
    process.exit(1);
  }
}

function getCoverageForPrefix(summary, prefix) {
  const matching = Object.entries(summary).filter(
    ([filePath]) => filePath.includes(prefix) && filePath !== "total",
  );

  if (matching.length === 0) return null;

  let totalLines = 0;
  let coveredLines = 0;

  for (const [, data] of matching) {
    totalLines += data.lines?.total ?? 0;
    coveredLines += data.lines?.covered ?? 0;
  }

  return totalLines === 0 ? 100 : Math.round((coveredLines / totalLines) * 100);
}

async function runGate() {
  const summary = await loadSummary();

  let failed = false;

  console.log("\nCoverage gate check\n" + "─".repeat(52));

  for (const [key, { lines: required, label }] of Object.entries(THRESHOLDS)) {
    const prefix = key === "utils" ? "/src/utils/" : "/src/components/";
    const actual = getCoverageForPrefix(summary, prefix);

    if (actual === null) {
      console.warn(`  ⚠  ${label}: no files found — skipping`);
      continue;
    }

    const pass = actual >= required;
    if (!pass) failed = true;

    console.log(
      `  ${pass ? "✓" : "✗"}  ${label}\n` +
      `       ${actual}% lines covered (required: ${required}%)\n`,
    );
  }

  console.log("─".repeat(52));

  if (failed) {
    console.error("✗ Coverage gate failed. Increase test coverage to meet thresholds.");
    process.exit(1);
  }

  console.log("✓ Coverage gate passed.\n");
}

runGate().catch((err) => {
  console.error("✗ Coverage gate error:", err.message);
  process.exit(1);
});
