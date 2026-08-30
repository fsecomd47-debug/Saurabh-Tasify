import { readFileSync } from "fs";
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const get = (k) => { const m = env.match(new RegExp("^" + k + "=(.+)$", "m")); return m ? m[1].trim().replace(/^["']|["']$/g, "") : ""; };
console.log("NEON_AUTH_BASE_URL:", get("NEON_AUTH_BASE_URL"));
console.log("NEON_AUTH_COOKIE_SECRET:", get("NEON_AUTH_COOKIE_SECRET") ? "set (" + get("NEON_AUTH_COOKIE_SECRET").length + " chars)" : "MISSING");
console.log("NEXT_PUBLIC_APP_URL:", get("NEXT_PUBLIC_APP_URL"));
console.log("SESSION_SECRET:", get("SESSION_SECRET") ? "set" : "MISSING");
