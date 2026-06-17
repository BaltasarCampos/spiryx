#!/usr/bin/env node
/**
 * Bundle-budget.mjs
 *
 * Checks that the production build stays within 220 KB gzipped budget.
 *
 * Usage:
 *   node scripts/bundle-budget.mjs
 *
 * Requires a completed `npm run build` (dist/ must exist).
 * Exits 1 if total gzipped JS exceeds the budget or if dist/ is missing.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BUDGET_KB = 220;
const BUDGET_BYTES = BUDGET_KB * 1024;
const DIST_DIR = join(__dirname, "..", "dist", "assets");

async function getJsFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    console.error("✗ dist/assets not found. Run `npm run build` first.");
    process.exit(1);
  }
  return entries.filter((f) => extname(f) === ".js").map((f) => join(dir, f));
}

async function checkBudget() {
  const jsFiles = await getJsFiles(DIST_DIR);

  if (jsFiles.length === 0) {
    console.error("✗ No JS files found in dist/assets. Run `npm run build` first.");
    process.exit(1);
  }

  let totalGzipped = 0;
  let failed = false;

  console.log("\nBundle size check (gzipped)\n" + "─".repeat(52));

  for (const filePath of jsFiles) {
    const raw = await readFile(filePath);
    const compressed = gzipSync(raw, { level: 9 });
    const kb = (compressed.length / 1024).toFixed(1);
    totalGzipped += compressed.length;

    const over = compressed.length > BUDGET_BYTES;
    if (over) failed = true;
    const status = over ? "✗ OVER" : "✓     ";
    console.log(`  ${status}  ${filePath.split("/").pop().padEnd(40)}  ${kb} KB`);
  }

  const totalKb = (totalGzipped / 1024).toFixed(1);
  const totalOver = totalGzipped > BUDGET_BYTES;
  if (totalOver) failed = true;

  console.log("─".repeat(52));
  console.log(
    `  ${totalOver ? "✗" : "✓"}      ${"TOTAL".padEnd(40)}  ${totalKb} KB / ${BUDGET_KB} KB budget\n`,
  );

  if (failed) {
    console.error(`✗ Bundle budget exceeded. Keep total gzipped JS under ${BUDGET_KB} KB.`);
    process.exit(1);
  }

  console.log("✓ Bundle budget check passed.");
}

checkBudget().catch((err) => {
  console.error("✗ Bundle budget check error:", err.message);
  process.exit(1);
});