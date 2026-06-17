#!/usr/bin/env node
/**
 * Privacy-audit.mjs
 *
 * Scans the production build for:
 *  - Known analytics/tracking script patterns
 *  - console.log calls left in production code
 *  - Hardcoded API keys or secrets
 *
 * Usage:
 *   node scripts/privacy-audit.mjs
 *
 * Requires a completed `npm run build` (dist/ must exist).
 * Exits 1 if any violation is found.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, "..", "dist");

// Patterns that must NOT appear in production output.
const VIOLATION_PATTERNS = [
  // Analytics / tracking scripts
  { pattern: /google-analytics\.com|googletagmanager\.com/i, label: "Google Analytics" },
  { pattern: /segment\.com|analytics\.js/i, label: "Segment analytics" },
  { pattern: /mixpanel/i, label: "Mixpanel" },
  { pattern: /hotjar/i, label: "Hotjar" },
  { pattern: /facebook\.net|fbevents/i, label: "Facebook pixel" },
  { pattern: /intercom/i, label: "Intercom" },
  { pattern: /amplitude/i, label: "Amplitude" },
  { pattern: /heap\.io/i, label: "Heap analytics" },
  { pattern: /plausible\.io/i, label: "Plausible analytics" },
  // console.log in production (Code Quality)
  { pattern: /console\.log\s*\(/, label: "console.log in production build" },
  // Suspicious hardcoded secrets (heuristic)
  { pattern: /api[_-]?key\s*[:=]\s*["'][^"']{16,}["']/i, label: "Hardcoded API key" },
  { pattern: /secret\s*[:=]\s*["'][^"']{8,}["']/i, label: "Hardcoded secret" },
];

async function getJsFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { recursive: true });
  } catch {
    console.error("✗ dist/ not found. Run `npm run build` first.");
    process.exit(1);
  }
  return entries
    .filter((f) => extname(f) === ".js" || extname(f) === ".html")
    .map((f) => join(dir, f));
}

async function auditFile(filePath) {
  const content = await readFile(filePath, "utf8");
  const violations = [];

  for (const { pattern, label } of VIOLATION_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(label);
    }
  }

  return violations;
}

async function runAudit() {
  const files = await getJsFiles(DIST_DIR);

  if (files.length === 0) {
    console.error("✗ No JS/HTML files found in dist/. Run `npm run build` first.");
    process.exit(1);
  }

  let totalViolations = 0;

  console.log("\nPrivacy & compliance audit\n" + "─".repeat(52));

  for (const filePath of files) {
    const violations = await auditFile(filePath);
    const shortName = filePath.replace(join(__dirname, "..") + "/", "");

    if (violations.length > 0) {
      totalViolations += violations.length;
      console.error(`  ✗  ${shortName}`);
      violations.forEach((v) => console.error(`       → ${v}`));
    } else {
      console.log(`  ✓  ${shortName}`);
    }
  }

  console.log("─".repeat(52));

  if (totalViolations > 0) {
    console.error(
      `\n✗ Privacy audit failed: ${totalViolations} violation(s) found.\n`,
    );
    process.exit(1);
  }

  console.log("\n✓ Privacy audit passed. No tracking scripts or secrets detected.\n");
}

runAudit().catch((err) => {
  console.error("✗ Privacy audit error:", err.message);
  process.exit(1);
});
