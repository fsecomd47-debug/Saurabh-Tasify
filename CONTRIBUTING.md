# Contributing

## Before Opening a PR

Run all quality gates:

```bash
npm run lint
npm run typecheck
npm run test
npm run security:check
npm run build
```

## Rules

- Do not commit secrets.
- Do not bypass server authorization.
- Do not modify economy values from the client.
- Do not introduce mock production data.
- Do not bypass verification for testing in production paths.
- Add regression tests for critical bug fixes.
- Preserve the existing design system.

## UI

All interfaces must remain consistent with the SaurabhTask iOS-style light design system.

## Game Systems

Rewards must be server-authoritative. Never trust client-sent values for:

- Coins, XP, or any currency
- Mission completion status
- Verification results
- Streak data
- Leaderboard scores

## Camera / CV

Never persist raw media unless explicitly required by an approved feature.

## PR Checklist

- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Tests pass
- [ ] Production build succeeds
- [ ] No secrets added
- [ ] Authorization checked
- [ ] Input validated
- [ ] iOS light theme preserved
- [ ] Mobile checked
