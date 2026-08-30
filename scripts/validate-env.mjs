#!/usr/bin/env node

// ============================================================
// SAURABHTASK — ENVIRONMENT VALIDATOR
// Validates required environment variables at build/start time
// ============================================================

import { existsSync, readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
let errors = [];
let warnings = [];

// Required in all environments
const REQUIRED = [
  "DATABASE_URL",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
];

// Required for specific features
const CONDITIONAL = {
  RESEND_API_KEY: "Email sending will be disabled",
  GROQ_API_KEY: "AI analysis will be disabled",
  VISION_API_KEY: "Vision features will use MediaPipe fallback",
};

// Format validators
const FORMATS = {
  DATABASE_URL: (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
  NEON_AUTH_BASE_URL: (v) => v.startsWith("http"),
  NEXT_PUBLIC_APP_URL: (v) => v.startsWith("http"),
};

function validate() {
  const mode = process.env.NODE_ENV || "development";

  console.log(`\n🔍 Validating environment (${mode})...\n`);

  // Check required variables
  for (const key of REQUIRED) {
    const val = process.env[key];
    if (!val) {
      errors.push(`Missing required: ${key}`);
    } else if (val.includes("password") || val.includes("changeme")) {
      errors.push(`${key} appears to contain a placeholder value`);
    }
  }

  // Check format
  for (const [key, validator] of Object.entries(FORMATS)) {
    const val = process.env[key];
    if (val && !validator(val)) {
      errors.push(`${key} has invalid format: ${val.slice(0, 20)}...`);
    }
  }

  // Check conditional
  for (const [key, msg] of Object.entries(CONDITIONAL)) {
    if (!process.env[key]) {
      warnings.push(`${key} not set — ${msg}`);
    }
  }

  // Check for accidental secrets in NEXT_PUBLIC_ prefix
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("NEXT_PUBLIC_")) {
      const val = process.env[key];
      if (val && (val.length > 50 || /[A-Za-z0-9]{32,}/.test(val))) {
        warnings.push(`${key} looks like a secret but has NEXT_PUBLIC_ prefix — will be exposed to client`);
      }
    }
  }

  // Check .env.local exists
  if (!existsSync(join(ROOT, ".env.local")) && !existsSync(join(ROOT, ".env"))) {
    warnings.push("No .env.local or .env file found — using process environment only");
  }

  // Report
  if (warnings.length > 0) {
    console.log("⚠️  Warnings:");
    for (const w of warnings) {
      console.log(`   ${w}`);
    }
    console.log("");
  }

  if (errors.length > 0) {
    console.log("❌ Errors:");
    for (const e of errors) {
      console.log(`   ${e}`);
    }
    console.log("");
    console.log("Set missing variables in .env.local or your hosting provider.");
    process.exit(1);
  }

  console.log("✅ Environment validation passed.\n");
  process.exit(0);
}

validate();
