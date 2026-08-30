// Probe Neon Auth social sign-in contract
const AUTH = "https://ep-delicate-wave-azbafn8t.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth";

const res = await fetch(`${AUTH}/sign-in/social`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
  body: JSON.stringify({ provider: "google", callbackURL: "http://localhost:3000/api/auth/oauth/google/callback" }),
});
console.log("STATUS:", res.status);
console.log("SET-COOKIE:", res.headers.getSetCookie?.() ?? []);
const text = await res.text();
console.log("BODY:", text.slice(0, 600));
try {
  const j = JSON.parse(text);
  if (j.url) {
    const u = new URL(j.url);
    console.log("\nGOOGLE URL host:", u.host, "| path:", u.pathname);
    console.log("redirect_uri:", u.searchParams.get("redirect_uri"));
    console.log("client_id:", (u.searchParams.get("client_id") ?? "").slice(0, 20) + "…");
    console.log("state present:", !!u.searchParams.get("state"));
  }
} catch {}
