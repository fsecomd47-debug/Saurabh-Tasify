#!/usr/bin/env node

// ============================================================
// SAURABHTASK — RELEASE CHECK SCRIPT
// Runs the full pre-release quality pipeline
// ============================================================

import { execSync } from "child_process";

const steps = [
  { name: "Validate Environment", cmd: "node scripts/validate-env.mjs" },
  { name: "Security Check", cmd: "npm run security:check" },
  { name: "Lint", cmd: "npm run lint" },
  { name: "Typecheck", cmd: "npm run typecheck" },
  { name: "Unit Tests", cmd: "npm run test" },
  { name: "Production Check", cmd: "node scripts/production-check.mjs" },
  { name: "Production Build", cmd: "npm run build" },
];

console.log("\n🚀 SaurabhTask Release Check\n");
console.log(`${"═".repeat(50)}\n`);

let failed = false;

for (const step of steps) {
  console.log(`\n▶ ${step.name}...`);
  try {
    execSync(step.cmd, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || "production" },
    });
    console.log(`  ✅ ${step.name} passed`);
  } catch (e) {
    console.log(`\n  ❌ ${step.name} FAILED`);
    console.log(`\n${"═".repeat(50)}`);
    console.log(`  RELEASE BLOCKED — ${step.name} failed`);
    console.log(`${"═".repeat(50)}\n`);
    process.exit(1);
  }
}

console.log(`\n${"═".repeat(50)}`);
console.log("  ✅ ALL RELEASE CHECKS PASSED");
console.log(`${"═".repeat(50)}\n`);
process.exit(0);
