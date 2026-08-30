import { defineConfig } from "drizzle-kit";
import { readFileSync } from "fs";
import { resolve } from "path";

// drizzle-kit does not load .env.local automatically — parse it here.
function loadEnvFile() {
  try {
    const raw = readFileSync(resolve(__dirname, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // no .env.local — rely on ambient environment (CI/production)
  }
}
loadEnvFile();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
