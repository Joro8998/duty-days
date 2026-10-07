# Duty Days — notes for Claude Code

The full spec is in `SPEC.md`. Read it before starting any phase.

## How we work

- Build **one phase at a time** (SPEC.md section 8). Stop at the end of each phase, summarize what changed, and say how to check it.
- Ask before adding a dependency that isn't in SPEC.md section 2.
- Pay rules live only in `src/lib/pay.ts` as pure functions. UI never calculates money on its own.
- If a pay rule seems unclear or two rules conflict, stop and ask. Don't guess.

## Rules that are easy to get wrong

- All money in **integer cents**. Soft day rate = round(hourly × 1.5) to the cent, then × 8.
- Dates are `'YYYY-MM-DD'` strings. Never `new Date('YYYY-MM-DD')` for logic (UTC shift).
- Return day of a trip takes the **previous night's** Domestic/International type. Same-day trips are always Domestic.
- One per diem per date (higher rate wins). Worked days off earn per diem **and** soft day pay.
- Trips crossing months are split by date.

## Privacy

The repo is public. **No real names, pay rates, or trip numbers in code or tests.** Personal values come from the first-run setup screen and stay on the phone.

## Commands

- `npm run dev` — local dev server
- `npm test` — Vitest
- `npm run build` — production build
