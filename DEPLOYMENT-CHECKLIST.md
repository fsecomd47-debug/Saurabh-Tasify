# Production Deployment Checklist — SaurabhTask

## Pre-Deploy (Run Before Every Deploy)

### 1. Build Verification
```bash
npm run build
npx tsc --noEmit
npm test
```
- [ ] Build completes with 0 errors
- [ ] TypeScript: 0 errors
- [ ] Tests: 78/78 pass

### 2. Environment Variables (Production)
Set these in your hosting provider's environment variables panel (e.g., Vercel, Railway, Render):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Neon recommended) |
| `SESSION_SECRET` | ✅ | Random string, min 32 chars. Generate: `openssl rand -hex 32` |
| `NEON_AUTH_COOKIE_SECRET` | ✅ | From Neon Auth dashboard |
| `NEON_AUTH_BASE_URL` | ✅ | Neon Auth project URL |
| `RESEND_API_KEY` | ✅ | From resend.com API keys |
| `GROQ_API_KEY` | ✅ | From console.groq.com API keys |
| `NEXTAUTH_URL` | ✅ | Your production domain (e.g., `https://app.example.com`) |
| `NODE_ENV` | ✅ | Set to `production` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Your production domain |
| `NEXT_PUBLIC_API_URL` | ✅ | Your production domain |
| `KINDE_CLIENT_ID` | Optional | For OAuth social login |
| `KINDE_CLIENT_SECRET` | Optional | For OAuth social login |

**CRITICAL:** Never set `NEXT_PUBLIC_` prefix on secret values. All secrets must be server-only.

### 3. Database
- [ ] Run `npx drizzle-kit push` or apply migrations to production DB
- [ ] Verify tables: `users`, `profiles`, `playerProgress`, `missions`, `dailyEconomy`, `wallet`, `pets`, `petInventory`, `friendships`, `feedEvents`, `feedReactions`, `feedComments`, `challenges`, `socialMessages`, `notifications`, `reports`, `streaks`, `questProgress`, `dailyRewardClaims`
- [ ] Verify indexes exist on: `missions.status`, `friendships.(addresseeId, status)`, `questProgress.(userId)`

### 4. Third-Party Services
- [ ] Neon Auth: OAuth callbacks configured for production domain
- [ ] Resend: Verified sender domain
- [ ] Camera: `getUserMedia` requires HTTPS (production is fine)

---

## Deploy

### Vercel
```bash
vercel --prod
```

### Docker
```bash
docker build -t saurabh-task .
docker run -p 3000:3000 saurabh-task
```

### Node.js Production
```bash
npm run build
npm start
```

---

## Post-Deploy Verification

### Smoke Tests
- [ ] `/login` loads, shows login form
- [ ] OAuth flow completes (if configured)
- [ ] Session persists across page reloads
- [ ] `/home` shows dashboard after login
- [ ] `/tasks` — create and complete a task
- [ ] `/missions` — mission creation works
- [ ] `/pets` — pet store loads, purchase works
- [ ] `/leaderboard` — scores display
- [ ] `/social` — feed loads, friends list works
- [ ] `/settings` — privacy settings save
- [ ] `/statistics` — charts render

### API Endpoints
- [ ] `GET /api/auth/session` — returns session
- [ ] `GET /api/profile/me` — returns user profile
- [ ] `POST /api/tasks/[id]/complete` — task completion works with economy guard
- [ ] `GET /api/social/feed` — feed returns with correct visibility filtering

### Security Headers
```bash
curl -I https://your-domain.com
```
Verify:
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: camera=(self), microphone=()`

### Error Pages
- [ ] `/nonexistent-page` → 404 page with "Go to Home" link
- [ ] Trigger server error → error boundary with retry button

---

## Rollback Procedure

### Vercel
1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

### Database Rollback
- Database schema is additive only (no destructive migrations in this codebase)
- If needed: `npx drizzle-kit push --force` to re-sync schema

### Emergency Stop
If the app is exploitable:
1. Set `MAINTENANCE_MODE=true` in environment
2. Middleware redirects all traffic to maintenance page
3. Investigate and fix

---

## Known Issues (P2 — Not Blocking)

| Issue | Impact | Workaround |
|---|---|---|
| Challenge rewards not auto-paid | Players complete challenges but don't receive coins | Manual DB fix: update `wallet.coins` + insert `dailyEconomy` |
| Verification uses 3 modes but only `interactive` implemented | `hybrid` and `review` show "Coming Soon" | Not user-facing — feature flags control visibility |
| Evidence defense store is in-memory only | Server restart loses defense data | Ephemeral — acceptable for now |
| 5 POST routes missing rate limiting | Potential abuse on mutation endpoints | Monitor in production, add rate limiting incrementally |
| In-memory rate limiter ineffective on serverless | Rate limits reset on cold starts | Replace with Redis-based limiter for production scale |
| OAuth callback doesn't create `st_session` cookie | Users may need to re-authenticate after OAuth | Add session cookie creation to kinde-sync route |
| `useInvalidateGame` doesn't invalidate social queries | Social feed may show stale data after mutations | Manual refresh or use `qk.social` invalidation |

---

## Monitoring (Post-Launch)

### Metrics to Watch
- [ ] Error rate (should be < 1%)
- [ ] API response times (p95 < 500ms)
- [ ] Database connection count
- [ ] Daily active users
- [ ] Task completion rate
- [ ] Economy exploit attempts (check `dailyEconomy` table for anomalies)

### Alert Thresholds
- Error rate > 5% for 5 minutes → investigate
- API p95 > 2s for 10 minutes → scale up
- DB connections > 80% pool → scale DB
- Suspicious `dailyEconomy` patterns → pause economy, investigate
