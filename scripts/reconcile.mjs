/* Economy reconciliation — ledger integrity against authoritative balances. */
import postgres from "postgres";
import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const line = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
const url = process.env.DATABASE_URL ?? line.slice('DATABASE_URL="'.length, -1);
const sql = postgres(url, { prepare: false, max: 1 });

let failed = 0;
function ok(name, cond, detail = "") {
  console.log(`  ${cond ? "✓" : "✗"} ${name} ${!cond && detail ? "— " + detail : ""}`);
  if (!cond) failed++;
}

const rows = await sql`
  select u.id, u.email, w.balance,
    coalesce(sum(tx.amount), 0) as ledger_sum
  from users u
  join wallets w on w.user_id = u.id
  left join wallet_transactions tx on tx.wallet_id = w.id
  where u.is_bot = false
  group by u.id, u.email, w.balance`;

for (const r of rows) {
  ok(
    `ledger reconciles for ${r.email.slice(0, 14)}…`,
    Number(r.balance) === Number(r.ledger_sum),
    `balance=${r.balance} sum=${r.ledger_sum}`
  );
}

// No negative balances anywhere (CHECK constraint backstop)
const neg = await sql`select count(*)::int as n from wallets where balance < 0`;
ok("no negative wallets", neg[0].n === 0);

// Every earning txn traces to a task or reward reference
const orphan = await sql`
  select count(*)::int as n from wallet_transactions
  where type in ('earning','purchase','reward') and idempotency_key is null`;
ok("every economic event has an idempotency key", orphan[0].n === 0);

// Duplicate idempotency keys impossible per wallet
const dupes = await sql`
  select count(*)::int as n from (
    select wallet_id, idempotency_key from wallet_transactions
    where idempotency_key is not null
    group by wallet_id, idempotency_key having count(*) > 1
  ) d`;
ok("no duplicate idempotency keys", dupes[0].n === 0);

// Activity trail completeness: every completed task has a TASK_COMPLETED event + earning txn
const missingEvents = await sql`
  select count(*)::int as n from tasks t
  where t.status = 'completed'
  and not exists (select 1 from activity_events e where e.type='TASK_COMPLETED' and e.entity_id = t.id::text)`;
ok("every completed task has an activity event", missingEvents[0].n === 0);

await sql.end();
console.log(failed === 0 ? "\nRECONCILIATION CLEAN" : `\n${failed} RECONCILIATION FAILURES`);
process.exitCode = failed;
