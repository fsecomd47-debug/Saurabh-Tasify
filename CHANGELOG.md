# Changelog

## 1.0.0

### Added
- Task system with quick completion
- Mission system with camera verification
- MediaPipe pose detection for verification
- AI-powered vision analysis (Groq)
- Pet system with mining, leveling, store
- Quest system with daily/weekly objectives
- Daily reward claim with streak tracking
- Wallet economy with coins and XP
- Leaderboard with weekly resets
- Social system: feed, friends, challenges, messaging
- Profile with stats, achievements, avatars
- Settings with privacy controls
- Onboarding flow with playstyle selection
- 404 page with video background
- Error boundaries with retry
- Health endpoint (`/api/health`)
- Production CI/CD pipeline
- Security scanning pipeline
- Environment validation
- Production readiness checks
- Release validation pipeline
- Commit message convention enforcement
- Dependabot dependency monitoring

### Security
- Server-authoritative economy — all rewards computed server-side
- Daily earning cap (5,000 coins) and per-mission clamp (1,500)
- `FOR UPDATE` row locking on economic mutations
- Idempotent ledger entries for settlement
- Session-based auth with `st_session` cookie
- Middleware route protection for all authenticated pages
- SQL-level feed visibility filtering (public/friends/private)
- Rate limiting on sensitive endpoints
- Security headers (HSTS, nosniff, DENY frame, CSP-ready)
- Secret detection in CI
- Dependency audit in CI

### Infrastructure
- Next.js 14 App Router with TypeScript strict mode
- PostgreSQL (Neon) with Drizzle ORM
- Vitest unit tests (78 tests)
- GitHub Actions CI (lint → typecheck → tests → security → build)
- GitHub Actions security scan (weekly + PR)
- GitHub Actions deploy workflow
- Dependabot weekly updates
- PR template with full checklist
- Issue templates (bug, feature, security)
