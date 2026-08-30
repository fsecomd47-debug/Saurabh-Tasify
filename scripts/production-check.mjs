#!/usr/bin/env node

// ============================================================
// SAURABHTASK — PRODUCTION CHECK SCRIPT
// Verifies production readiness before deploy
// ============================================================

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
let pass = 0;
let fail = 0;
let warn = 0;

function check(label, fn) {
  try {
    const result = fn();
    if (result === true) {
      console.log(`  ✅ ${label}`);
      pass++;
    } else if (result === "warn") {
      console.log(`  ⚠️  ${label}`);
      warn++;
    } else {
      console.log(`  ❌ ${label}`);
      fail++;
    }
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message}`);
    fail++;
  }
}

console.log("\n🔒 SaurabhTask Production Check\n");

// 1. NODE_ENV
check("NODE_ENV is production", () => {
  return process.env.NODE_ENV === "production" || "warn";
});

// 2. Required files exist
const REQUIRED_FILES = [
  "next.config.js",
  "tsconfig.json",
  "package.json",
  "package-lock.json",
  ".env.example",
  ".gitignore",
  "README.md",
  "SECURITY.md",
];

for (const file of REQUIRED_FILES) {
  check(`File: ${file}`, () => existsSync(join(ROOT, file)));
}

// 3. No .env.local in production
check("No .env.local in repo", () => {
  return !existsSync(join(ROOT, ".env.local"));
});

// 4. Build artifacts exist
check("Build artifacts (.next/)", () => {
  return existsSync(join(ROOT, ".next"));
});

// 5. No debug code in source
check("No debug/log statements in API routes", () => {
  const apiDir = join(ROOT, "src/app/api");
  if (!existsSync(apiDir)) return true;
  let found = false;
  function scan(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        scan(full);
        continue;
      }
      if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) continue;
      const content = readFileSync(full, "utf-8");
      if (content.includes("console.log(") || content.includes("debugger")) {
        found = true;
      }
    }
  }
  scan(apiDir);
  return !found;
});

// 6. No mock/fake/bypass in production
check("No mock/fake/bypass in src/", () => {
  const srcDir = join(ROOT, "src");
  let found = false;
  const skipDirs = new Set(["node_modules", ".next", "test-results"]);
  function scan(dir) {
    for (const entry of readdirSync(dir)) {
      if (skipDirs.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        scan(full);
        continue;
      }
      if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) continue;
      const content = readFileSync(full, "utf-8").toLowerCase();
      if (/\bmock\b|\bfake\b|\bbypass\b/.test(content)) {
        found = true;
      }
    }
  }
  scan(srcDir);
  return !found;
});

// 7. package-lock.json is consistent
check("package-lock.json exists", () => {
  return existsSync(join(ROOT, "package-lock.json"));
});

// 8. Drizzle schema exists
check("Database schema exists", () => {
  return existsSync(join(ROOT, "src/db/schema.ts")) ||
    existsSync(join(ROOT, "db/schema.ts"));
});

// 9. Health endpoint exists
check("Health endpoint exists", () => {
  return existsSync(join(ROOT, "src/app/api/health/route.ts"));
});

// Report
console.log(`\n${"─".repeat(50)}`);
console.log(`  Passed: ${pass}  |  Failed: ${fail}  |  Warnings: ${warn}`);
console.log(`${"─".repeat(50)}\n`);

if (fail > 0) {
  console.log("❌ PRODUCTION CHECK FAILED — fix issues before deploying.\n");
  process.exit(1);
} else {
  console.log("✅ PRODUCTION CHECK PASSED.\n");
  process.exit(0);
}
