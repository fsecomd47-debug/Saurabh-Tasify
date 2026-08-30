# SaurabhTask

Gamified productivity platform. Task → Mission → Verification → Reward → Progress.

## Product

SaurabhTask turns daily tasks into an RPG-style progression loop:

- **Tasks** are plain to-dos that complete instantly.
- **Missions** are camera-verified tasks with XP, coins, streaks, and social accountability.
- **Verification** uses MediaPipe pose detection + AI analysis to confirm real-world actions.
- **Rewards** are server-authoritative — economy, pets, store, quests, and leaderboard.
- **Social** feeds, friends, challenges, and messaging amplify productivity accomplishment.

## Stack

- Next.js 14 (App Router)
- TypeScript
- React 18
- Tailwind CSS
- Framer Motion
- PostgreSQL (Neon)
- Drizzle ORM
- Neon Auth (Kinde OAuth)
- MediaPipe Vision (pose detection)
- Groq AI (vision analysis)
- TanStack React Query
- Zustand
- Zod
- Resend (email)
- Vitest (unit tests)

## Requirements

- Node.js 22 (see `.nvmrc`)
- npm
- PostgreSQL database (Neon recommended)
- Environment variables (see `.env.example`)

## Local Setup

```bash
# 1. Install dependencies
npm ci

# 2. Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL, NEON_AUTH_*, RESEND_API_KEY, GROQ_API_KEY

# 3. Run database migrations
npm run db:migrate

# 4. Start development server
npm run dev
```

## Quality Gates

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run test          # Vitest unit tests
npm run security:check # Secret/leak scan
npm run build         # Production build
```

## Production

```bash
npm run build
npm start
```

## Architecture

```
Task → Mission → Verification → Reward → Progression → Social
  │        │            │           │           │            │
  │        │            │           │           │            └── Feed, friends, challenges
  │        │            │           │           └── XP, level, coins, streaks
  │        │            │           └── Economy guard, daily cap, wallet
  │        │            └── Camera + AI pose analysis
  │        └── Duration, deadline, chain, compound
  └── Quick completion, no verification
```

## Security

Never commit:

- `.env` / `.env.local`
- API keys, tokens, passwords
- Database credentials
- Private certificates
- Raw camera recordings
- User evidence media
- Production logs

The client is untrusted. All security-sensitive validation occurs server-side.

## Deployment

Documented in `DEPLOYMENT-CHECKLIST.md`.

- Pre-deploy: environment variables, DB migrations, third-party service config
- Deploy: Vercel / Docker / Node.js
- Post-deploy: smoke tests, security header verification
- Rollback: Vercel promotion, DB recovery, maintenance mode

## License

Proprietary. See `LICENSE`.
