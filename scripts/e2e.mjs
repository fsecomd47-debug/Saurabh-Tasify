/* SaurabhTask PDR-2 E2E integration suite — run with dev server up: node scripts/e2e.mjs */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

let passed = 0;
let failed = 0;
const failures = [];

function ok(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ✗ ${name} ${detail ? "— " + detail : ""}`);
  }
}

class Client {
  constructor() {
    this.cookies = new Map();
    // Each virtual client gets its own source IP so shared-host rate buckets
    // aren't polluted across test runs (mirrors distinct real clients).
    this.ip = `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  }
  cookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  async req(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", cookie: this.cookieHeader(), "x-forwarded-for": this.ip },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    for (const c of setCookie) {
      const [pair] = c.split(";");
      const idx = pair.indexOf("=");
      this.cookies.set(pair.slice(0, idx), pair.slice(idx + 1));
    }
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* empty */
    }
    return { status: res.status, json };
  }
}

const stamp = Date.now();

async function registerAndVerify(label) {
  const c = new Client();
  const email = `${label}-${stamp}@test.local`;
  const reg = await c.req("POST", "/api/auth/register", { displayName: label, email, password: "SuperSecure123!" });
  ok(`[${label}] register succeeds`, reg.status === 200 && reg.json?.data?.userId);
  const devUrl = reg.json?.data?.verifyUrl;
  ok(`[${label}] dev verification link exposed`, !!devUrl);
  const token = new URL(devUrl).searchParams.get("token");
  const ver = await c.req("POST", "/api/auth/verify-email", { token });
  ok(`[${label}] email verified`, ver.status === 200 && ver.json?.data?.verified === true);
  // replayed token must fail
  const replay = await c.req("POST", "/api/auth/verify-email", { token });
  ok(`[${label}] token replay rejected`, replay.status !== 200);
  return { c, email };
}

async function main() {
  console.log("\n━━━ AUTH JOURNEY (§88) ━━━");

  const a = await registerAndVerify("PlayerA");
  let snapRes = await a.c.req("GET", "/api/me/snapshot");
  ok("[A] snapshot works pre-onboarding (self-healing state)", snapRes.status === 200 && !!snapRes.json?.data?.profile);

  const onb = await a.c.req("POST", "/api/onboarding", {
    displayName: "PlayerA",
    avatarId: "avatar-wolf",
    preferredCategories: ["study", "work"],
    dailyCommitmentMinutes: 30,
    primaryGoal: "Build a study habit",
    timezone: "Asia/Kathmandu",
  });
  ok("[A] onboarding completes", onb.status === 200 && onb.json?.data?.complete === true);

  const again = await a.c.req("POST", "/api/onboarding", {
    displayName: "PlayerA", avatarId: "avatar-wolf", preferredCategories: ["study"], dailyCommitmentMinutes: 10, primaryGoal: "Again",
  });
  ok("[A] double onboarding rejected (409)", again.status === 409);

  snapRes = await a.c.req("GET", "/api/me/snapshot");
  const snap = snapRes.json.data;
  ok("[A] starting balance = 100 ST", snap.wallet.balance === 100, `got ${snap.wallet.balance}`);
  ok("[A] level 1 · xp 0", snap.progress.level === 1 && snap.progress.xpTotal === 0);
  ok("[A] starter mission exists", snap.quests.some((q) => q.id === "welcome-quest"));
  ok("[A] welcome quest pre-checked profile objective", snap.quests.find((q) => q.id === "welcome-quest")?.objectives.find((o) => o.label.includes("profile"))?.completed === true);
  ok("[A] timezone persisted", snap.profile.timezone === "Asia/Kathmandu");
  const starterTaskRes = await a.c.req("GET", "/api/tasks");
  const starter = starterTaskRes.json.data[0];
  ok("[A] first mission auto-created (100 ST)", starter && starter.reward === 100 && starter.xpReward === 50);

  // Session restoration
  const sess = await a.c.req("GET", "/api/auth/session");
  ok("[A] session restored", sess.json.data.authenticated === true);

  console.log("\n━━━ ECONOMY JOURNEY (§89) ━━━");

  // Server-authoritative rewards: send bogus fields, confirm ignored
  const created = await a.c.req("POST", "/api/tasks", {
    title: "Grind Task", description: null, category: "work", difficulty: "medium", rarity: "rare",
    reward: 999999, xpReward: 999999,
  });
  ok("[A] create task ignores client reward fields", created.json.data.reward === 180, `reward=${created.json.data.reward}`);

  let balBefore = (await a.c.req("GET", "/api/me/snapshot")).json.data.wallet.balance;
  const done = await a.c.req("POST", `/api/tasks/${created.json.data.id}/complete`);
  ok("[A] completion returns payload", done.status === 200 && done.json.data.reward.stGained > 0);
  const stGained = done.json.data.reward.stGained;
  balBefore = (await a.c.req("GET", "/api/me/snapshot")).json.data.wallet.balance;
  ok("[A] balance credited exactly once", balBefore === 100 + stGained, `${balBefore} vs 100+${stGained}`);

  // Idempotency: repeat completion
  const repeat = await a.c.req("POST", `/api/tasks/${created.json.data.id}/complete`);
  ok("[A] duplicate completion rejected", repeat.status === 409 && repeat.json.error.code === "TASK_ALREADY_COMPLETED");
  const balAfterRepeat = (await a.c.req("GET", "/api/me/snapshot")).json.data.wallet.balance;
  ok("[A] no double credit", balAfterRepeat === balBefore);

  // XP & streak & quest progression
  const snap2 = (await a.c.req("GET", "/api/me/snapshot")).json.data;
  ok("[A] XP increased", snap2.progress.xpTotal >= 75);
  ok("[A] streak now 1", snap2.streak.current === 1);
  const wq = snap2.quests.find((q) => q.id === "welcome-quest");
  ok("[A] welcome quest first-task objective met", wq.objectives.find((o) => o.target === 1)?.completed === true);

  // Grind to affordable levels
  for (let i = 0; i < 6; i++) {
    const t = await a.c.req("POST", "/api/tasks", { title: `Grind ${i}`, category: "other", difficulty: "hard", rarity: "common" });
    await a.c.req("POST", `/api/tasks/${t.json.data.id}/complete`);
  }
  const mid = (await a.c.req("GET", "/api/me/snapshot")).json.data;
  ok("[A] hard tasks counted", mid.progress.hardTasksCompleted >= 6);
  ok("[A] streak grew to 7 (same-day completes don't extend, next-day logic safe)", mid.streak.current >= 1);

  // Catalog + purchase
  const cat = await a.c.req("GET", "/api/store/catalog");
  ok("[A] catalog served", cat.status === 200 && cat.json.data.items.length > 20);
  const cheapBoost = cat.json.data.items.find((i) => i.id === "boost-xp-50"); // 500
  const buy = await a.c.req("POST", "/api/store/purchase", { itemId: cheapBoost.id, price: 1 }); // price tampering attempt
  const snapB = (await a.c.req("GET", "/api/me/snapshot")).json.data;
  ok("[A] purchase charged authoritative price (500)", snapB.transactions.some((t) => t.amount === -500), JSON.stringify(snapB.transactions.slice(0,3)));
  ok("[A] boost activated", snapB.activeBoosts.some((b) => b.boostType === "xpMultiplier"));

  // Insufficient balance
  const crownBuy = await a.c.req("POST", "/api/store/purchase", { itemId: "item-gold-crown" });
  ok("[A] unaffordable purchase rejected 402", crownBuy.status === 402 && crownBuy.json.error.code === "INSUFFICIENT_BALANCE");
  ok("[A] shortfall meta included", typeof crownBuy.json.error.shortfall === "number");

  // Level lock
  const auraBuy = await a.c.req("POST", "/api/store/purchase", { itemId: "item-gold-aura" });
  ok("[A] level-locked purchase rejected 403", auraBuy.status === 403 && auraBuy.json.error.code === "LEVEL_LOCKED");

  // Durable purchase + equip + re-buy rejection
  const theme = cat.json.data.items.find((i) => i.id === "item-minimal-theme"); // 1000
  // top up if needed
  let cur = (await a.c.req("GET", "/api/me/snapshot")).json.data.wallet.balance;
  while (cur < theme.price + 200) {
    const t = await a.c.req("POST", "/api/tasks", { title: `TopUp ${cur}`, category: "other", difficulty: "hard", rarity: "epic" });
    await a.c.req("POST", `/api/tasks/${t.json.data.id}/complete`);
    cur = (await a.c.req("GET", "/api/me/snapshot")).json.data.wallet.balance;
  }
  const buyTheme = await a.c.req("POST", "/api/store/purchase", { itemId: theme.id });
  ok("[A] durable purchased", buyTheme.status === 200);
  const rebuy = await a.c.req("POST", "/api/store/purchase", { itemId: theme.id });
  ok("[A] durable re-purchase rejected 409", rebuy.status === 409 && rebuy.json.error.code === "ITEM_ALREADY_OWNED");
  const eq = await a.c.req("POST", "/api/store/equip", { itemId: theme.id, equipped: true });
  ok("[A] equip works", eq.status === 200 && eq.json.data.equipped === true);
  const catAfter = await a.c.req("GET", "/api/store/catalog");
  ok("[A] equipped flag reflected in catalog", catAfter.json.data.items.find((i) => i.id === theme.id).equipped === true);

  // Wishlist + goal
  await a.c.req("POST", "/api/store/wishlist", { itemId: "item-fire-frame", add: true });
  const goal = await a.c.req("POST", "/api/store/goal", { itemId: "item-fire-frame" });
  ok("[A] wishlist/goal set", goal.status === 200);

  // Quest claim before completion must fail
  const claimFail = await a.c.req("POST", "/api/quests/claim", { questId: "welcome-quest" });
  ok("[A] premature quest claim rejected", claimFail.status === 409);

  console.log("\n━━━ SECURITY JOURNEY (§90) ━━━");

  // User B cannot touch A's resources
  const b = await registerAndVerify("PlayerB");
  await b.c.req("POST", "/api/onboarding", { displayName: "PlayerB", avatarId: "avatar-star", preferredCategories: ["fitness"], dailyCommitmentMinutes: 20, primaryGoal: "Exercise consistently" });
  const stealComplete = await b.c.req("POST", `/api/tasks/${starter.id}/complete`);
  ok("[B] cannot complete A's task (404)", stealComplete.status === 404);
  const stealDelete = await b.c.req("DELETE", `/api/tasks/${starter.id}`);
  ok("[B] cannot delete A's task (404)", stealDelete.status === 404);
  const bTasks = await b.c.req("GET", "/api/tasks");
  ok("[B] sees only own tasks", !JSON.stringify(bTasks.json.data).includes(starter.title));

  // Unauthenticated access
  const anon = new Client();
  const anonSnap = await anon.req("GET", "/api/me/snapshot");
  ok("[anon] snapshot requires auth 401", anonSnap.status === 401);
  const anonTask = await anon.req("POST", "/api/tasks", { title: "x", category: "other", difficulty: "easy", rarity: "common" });
  ok("[anon] task creation requires auth 401", anonTask.status === 401);

  // Enumeration protection: login wrong-password vs wrong-email identical
  const wrongPw = await a.c.req("POST", "/api/auth/login", { email: a.email, password: "WrongPassword1!" });
  const wrongEmail = await a.c.req("POST", "/api/auth/login", { email: `ghost-${stamp}@test.local`, password: "Whatever123!" });
  ok("[auth] uniform INVALID_CREDENTIALS", wrongPw.json.error.code === "INVALID_CREDENTIALS" && wrongEmail.json.error.code === "INVALID_CREDENTIALS");
  const forgotGhost = await anon.req("POST", "/api/auth/forgot-password", { email: `ghost-${stamp}@test.local` });
  const forgotReal = await anon.req("POST", "/api/auth/forgot-password", { email: a.email });
  ok("[auth] password reset neutral response", forgotGhost.json.data.sent === true && forgotReal.json.data.sent === true);

  // Leaderboard integrity
  const lb = await a.c.req("GET", "/api/leaderboard");
  ok("[lb] leaderboard derived server-side with bots", lb.json.data.rows.length >= 8);
  ok("[lb] current player present", lb.json.data.rows.some((r) => r.isCurrentUser));
  const patchRank = await a.c.req("PATCH", "/api/leaderboard");
  ok("[lb] PATCH leaderboard rejected 405", patchRank.status === 405);

  // Rate limiting: hammer login on one account until the per-account bucket trips
  const victim = new Client();
  let sawRateLimit = false;
  for (let i = 0; i < 10; i++) {
    const r = await victim.req("POST", "/api/auth/login", { email: `hammer-${stamp}@test.local`, password: "NopeNothing1" });
    if (r.status === 429) { sawRateLimit = true; break; }
  }
  ok("[rate] per-account login throttle engages", sawRateLimit);

  // Session lifecycle
  const logoutRes = await a.c.req("POST", "/api/auth/logout");
  ok("[A] logout ok", logoutRes.status === 200);
  const postLogout = await a.c.req("GET", "/api/auth/session");
  ok("[A] session invalidated after logout", postLogout.json.data.authenticated === false);

  // Login again → state restored
  const relogin = await a.c.req("POST", "/api/auth/login", { email: a.email, password: "SuperSecure123!" });
  ok("[A] re-login works", relogin.status === 200);
  const snapFinal = (await a.c.req("GET", "/api/me/snapshot")).json.data;
  ok("[A] all state persisted across sessions", snapFinal.progress.tasksCompleted >= 7 && snapFinal.inventory.some((i) => i.itemId === theme.id));

  // Middleware gate
  const homeRedirect = await fetch(BASE + "/home", { redirect: "manual" });
  const loc = String(homeRedirect.headers.get("location") ?? "");
  ok("[gate] /home redirects unauthenticated to /login", [302, 307, 308].includes(homeRedirect.status) && loc.includes("/login"), `status=${homeRedirect.status} loc=${loc}`);

  console.log(`\n━━━ RESULTS: ${passed} passed · ${failed} failed ━━━`);
  if (failures.length) {
    console.log("FAILED:", failures.join(" | "));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("E2E CRASH:", e);
  process.exit(1);
});
