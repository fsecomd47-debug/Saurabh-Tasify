# Security Policy

## Reporting a Vulnerability

Do not publicly disclose security vulnerabilities before they are addressed.

Report security issues through the project's private security contact or GitHub's Private Vulnerability Reporting.

## Sensitive Areas

Particular attention is required for:

- **Authentication** — session management, OAuth flows, cookie handling
- **Authorization** — IDOR prevention, route protection
- **Economy** — wallet, coins, daily earning caps, reward settlement
- **Game Systems** — pet mining, quest rewards, store purchases
- **Verification** — camera access, evidence uploads, AI analysis
- **Social** — friend requests, messaging, feed visibility, reports
- **Leaderboard** — score integrity, anti-cheat

## Never Commit

- Passwords
- API keys
- Tokens
- Database credentials
- Private certificates
- Raw user evidence
- Raw camera recordings
- Production logs

## Production Principle

**The client is untrusted.**

All security-sensitive validation must occur server-side:

- Economy mutations use `FOR UPDATE` + idempotent ledger entries
- Daily earning caps enforced in `economy-guard.ts`
- Camera verification requires real pose data
- Social actions require authenticated session
- Feed visibility respects privacy settings at the SQL level
- Rate limiting on mutation endpoints

## Dependencies

Run `npm audit` regularly. Review vulnerabilities rather than blindly applying every automated fix.
