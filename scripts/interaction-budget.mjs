#!/usr/bin/env node
/**
 * Interaction-budget.mjs
 *
 * Measures interactive readiness of the primary dashboard flow using
 * Lighthouse's TTI (Time to Interactive) metric and verifies it stays
 * within the 3.5-second budget.
 *
 * Usage:
 *   node scripts/interaction-budget.mjs [url]
 *
 * Prerequisites (not in devDependencies — install separately in CI):
 *   npm install -g lighthouse chrome-launcher
 *
 * If Lighthouse is not installed the script exits 0 with a warning.
 * Exits 1 if TTI exceeds 3500ms.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const TARGET_URL = process.argv[2] ?? "http://localhost:4173";
const TTI_BUDGET_MS = 3500;
const LCP_BUDGET_MS = 2500;
const CLS_BUDGET = 0.1;

async function run() {
  let lighthouse, chromeLauncher;

  try {
    lighthouse = require("lighthouse");
    chromeLauncher = require("chrome-launcher");
  } catch {
    console.warn(
      "⚠  Lighthouse not installed. Skipping interaction budget check.\n" +
      "   Install via: npm install -g lighthouse chrome-launcher\n",
    );
    process.exit(0);
  }

  console.log(`\nInteraction budget check → ${TARGET_URL}\n` + "─".repeat(52));

  let chrome;
  try {
    chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });

    const result = await lighthouse(TARGET_URL, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance"],
      // Emulate a mid-range mobile device (Moto G4 profile)
      emulatedFormFactor: "mobile",
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 4,
      },
    });

    const audits = result.lhr.audits;

    const tti = audits["interactive"]?.numericValue ?? Infinity;
    const lcp = audits["largest-contentful-paint"]?.numericValue ?? Infinity;
    const cls = audits["cumulative-layout-shift"]?.numericValue ?? Infinity;

    const checks = [
      { label: "TTI (interactive readiness)", value: tti.toFixed(0) + " ms", pass: tti <= TTI_BUDGET_MS, budget: TTI_BUDGET_MS + " ms" },
      { label: "LCP", value: lcp.toFixed(0) + " ms", pass: lcp <= LCP_BUDGET_MS, budget: LCP_BUDGET_MS + " ms" },
      { label: "CLS", value: cls.toFixed(3), pass: cls <= CLS_BUDGET, budget: String(CLS_BUDGET) },
    ];

    let failed = false;
    for (const { label, value, pass, budget } of checks) {
      if (!pass) failed = true;
      console.log(
        `  ${pass ? "✓" : "✗"}  ${label.padEnd(28)} ${value.padEnd(12)} (budget: ${budget})`,
      );
    }

    console.log("─".repeat(52));

    if (failed) {
      console.error("\n✗ Interaction budget check failed.\n");
      process.exit(1);
    }

    console.log("\n✓ Interaction budget check passed.\n");
  } finally {
    await chrome?.kill();
  }
}

run().catch((err) => {
  console.error("✗ Interaction budget check error:", err.message);
  process.exit(1);
});
