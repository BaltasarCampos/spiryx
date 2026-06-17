#!/usr/bin/env node
/**
 * Lighthouse-check.mjs
 *
 * Runs Lighthouse against the local Vite preview server and checks that
 * all scores meet the constitution targets (>= 90 across Performance,
 * Accessibility, Best Practices, SEO).
 *
 * Usage:
 *   node scripts/lighthouse-check.mjs [url]
 *
 * Prerequisites (not in devDependencies — install separately in CI):
 *   npm install -g lighthouse chrome-launcher
 *
 * If Lighthouse is not installed, the script exits 0 with a warning so
 * it does not block local development workflows.
 *
 * Exits 1 if any Lighthouse score is below the threshold.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const TARGET_URL = process.argv[2] ?? "http://localhost:4173";
const THRESHOLD = 90;

const CATEGORIES = [
  { key: "performance", label: "Performance" },
  { key: "accessibility", label: "Accessibility" },
  { key: "best-practices", label: "Best Practices" },
  { key: "seo", label: "SEO" },
];

async function run() {
  let lighthouse, chromeLauncher;

  try {
    lighthouse = require("lighthouse");
    chromeLauncher = require("chrome-launcher");
  } catch {
    console.warn(
      "⚠  Lighthouse not installed. Skipping Lighthouse check.\n" +
      "   Install via: npm install -g lighthouse chrome-launcher\n" +
      "   Then run: node scripts/lighthouse-check.mjs\n",
    );
    // Exit 0 so local workflows are not blocked when Lighthouse is absent.
    process.exit(0);
  }

  console.log(`\nLighthouse check → ${TARGET_URL}\n` + "─".repeat(52));

  let chrome;
  try {
    chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });

    const result = await lighthouse(TARGET_URL, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: CATEGORIES.map((c) => c.key),
    });

    const { categories } = result.lhr;
    let failed = false;

    for (const { key, label } of CATEGORIES) {
      const score = Math.round((categories[key]?.score ?? 0) * 100);
      const pass = score >= THRESHOLD;
      if (!pass) failed = true;
      console.log(`  ${pass ? "✓" : "✗"}  ${label.padEnd(20)} ${score} / ${THRESHOLD}`);
    }

    console.log("─".repeat(52));

    if (failed) {
      console.error(
        `\n✗ Lighthouse gate failed. All scores must be >= ${THRESHOLD}.\n`,
      );
      process.exit(1);
    }

    console.log(`\n✓ Lighthouse gate passed.\n`);
  } finally {
    await chrome?.kill();
  }
}

run().catch((err) => {
  console.error("✗ Lighthouse check error:", err.message);
  process.exit(1);
});
