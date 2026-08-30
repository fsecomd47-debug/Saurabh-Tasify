#!/usr/bin/env node

// ============================================================
// SAURABHTASK — SECURITY CHECK SCRIPT
// Scans for accidental production leaks before commit
// ============================================================

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const ROOT = process.cwd();

const PATTERNS = [
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}/gi, label: "Hardcoded API key" },
  { pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}/gi, label: "Hardcoded secret/password" },
  { pattern: /(?:token|jwt|bearer)\s*[:=]\s*["'][A-Za-z0-9_\-\.]{20,}/gi, label: "Hardcoded token" },
  { pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, label: "Private key block" },
  { pattern: /(?:SESSION_SECRET|NEON_AUTH_COOKIE_SECRET|GROQ_API_KEY|RESEND_API_KEY)\s*=\s*["'][^"']+["']/g, label: "Secret in source (not .env)" },
];

const SKIP_DIRS = new Set([
  "node_modules", ".next", "out", "dist", "build",
  ".git", "coverage", "test-results", "playwright-report",
  "drizzle", "models", "model-cache",
]);

const SCAN_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".yml", ".yaml", ".md", ".env",
]);

let findings = [];
let filesScanned = 0;

function scanDir(dir, depth = 0) {
  if (depth > 8) return;
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    if (entry.startsWith(".") && entry !== ".env.example") continue;

    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      scanDir(full, depth + 1);
      continue;
    }

    const ext = extname(entry).toLowerCase();
    if (!SCAN_EXTS.has(ext)) continue;

    // Skip .env.example and .env.local.example
    if (entry === ".env.example" || entry.includes(".env.example")) continue;

    let content;
    try {
      content = readFileSync(full, "utf-8");
    } catch {
      continue;
    }

    filesScanned++;

    for (const { pattern, label } of PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        const lineNum = content.slice(0, match.index).split("\n").length;
        findings.push({
          file: full.replace(ROOT + "/", ""),
          line: lineNum,
          label,
          snippet: match[0].slice(0, 60) + (match[0].length > 60 ? "..." : ""),
        });
      }
    }
  }
}

console.log("\n🔒 SaurabhTask Security Check\n");
console.log(`Scanning ${ROOT}...\n`);

scanDir(ROOT);

if (findings.length === 0) {
  console.log(`✅ PASS — ${filesScanned} files scanned, no issues found.\n`);
  process.exit(0);
} else {
  console.log(`⚠️  ${findings.length} potential issue(s) found in ${filesScanned} files:\n`);
  for (const f of findings) {
    console.log(`  ${f.label}`);
    console.log(`    File: ${f.file}:${f.line}`);
    console.log(`    Match: ${f.snippet}`);
    console.log("");
  }
  console.log("Review these findings manually. Not all are bugs — some may be false positives.");
  console.log("If a finding is a real secret, rotate/revoke it immediately.\n");
  process.exit(1);
}
