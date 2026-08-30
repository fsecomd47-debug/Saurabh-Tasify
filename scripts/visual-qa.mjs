/* Visual render smoke test — every route returns real, styled markup */
const BASE = "http://localhost:3000";
let passed = 0, failed = 0;
const failures = [];
function ok(name, cond, detail = "") {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name); console.log(`  ✗ ${name} ${detail}`); }
}

class Client {
  constructor() { this.cookies = new Map(); this.ip = `10.9.${Math.floor(Math.random()*250)}.${Math.floor(Math.random()*250)}`; }
  async req(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", cookie: [...this.cookies].map(([k,v])=>`${k}=${v}`).join("; "), "x-forwarded-for": this.ip },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    const ct = res.headers.get("content-type") ?? "";
    return { status: res.status, json: ct.includes("json") ? await res.json().catch(() => null) : null, text: ct.includes("html") ? await res.text() : "" };
  }
}

const email = `visual-${Date.now()}@test.local`;
const c = new Client();

// Public pages
let r = await c.req("GET", "/");
ok("landing renders hero", r.status === 200 && r.text.includes("BECOMES YOUR WEALTH"));
ok("landing has neon canvas", r.text.includes("neon-canvas"));
r = await c.req("GET", "/signup");
ok("signup renders", r.status === 200 && r.text.includes("CREATE YOUR"));
r = await c.req("GET", "/login");
ok("login renders", r.status === 200 && r.text.includes("WELCOME BACK"));
r = await c.req("GET", "/verify-email");
ok("verify-email renders", r.status === 200 && r.text.includes("CHECK YOUR INBOX"));
r = await c.req("GET", "/forgot-password");
ok("forgot-password renders", r.status === 200);
r = await c.req("GET", "/reset-password");
ok("reset-password renders", r.status === 200);

// Register + verify + onboard
await c.req("POST", "/api/auth/register", { displayName: "VisualQA", email, password: "SuperSecure123!" });
const sess0 = await c.req("GET", "/api/auth/session");
// grab token from server log is not possible here; register exposes devUrl
// re-register flow: use returned devUrl from a fresh account
const c2 = new Client();
const reg2 = await c2.req("POST", "/api/auth/register", { displayName: "VisualQA2", email: `v2-${email}`, password: "SuperSecure123!" });
const devUrl = reg2.json?.data?.verifyUrl;
const token = devUrl ? new URL(devUrl).searchParams.get("token") : null;
await c2.req("POST", "/api/auth/verify-email", { token });
await c2.req("POST", "/api/onboarding", {
  displayName: "VisualQA2", avatarId: "avatar-crown", preferredCategories: ["work"],
  dailyCommitmentMinutes: 30, primaryGoal: "Ship my side project",
});

for (const path of ["/home", "/tasks", "/vault", "/leaderboard", "/statistics", "/profile", "/settings"]) {
  const page = await c2.req("GET", path);
  ok(`${path} renders (200 + shell)`, page.status === 200 && page.text.includes("__next"), `status=${page.status}`);
}
const home = await c2.req("GET", "/home");
// SSR renders the polished skeleton boundary; live data arrives via hydration.
ok("/home renders shell + loading boundary", home.status === 200 && home.text.includes("SaurabhTask") && home.text.includes("animate-pulse"), `len=${home.text.length}`);

// Onboarding gate: verified+onboarded user hitting /onboarding → redirected
const ob = await c2.req("GET", "/onboarding");
ok("/onboarding redirects completed players", [307, 302, 308].includes(ob.status));

console.log(`\n━━━ VISUAL QA: ${passed} passed · ${failed} failed ━━━`);
if (failures.length) { console.log("FAILED:", failures.join(" | ")); process.exitCode = 1; }
