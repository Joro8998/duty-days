# Duty Days — notes for Claude Code

The full spec is in `SPEC.md`. Read it before starting any phase. SPEC.md is the original plan. Where it disagrees with **Current state** below, Current state wins.

## Current state (v0.3.0)

All 9 phases of SPEC.md are done. The app is live at https://joro8998.github.io/duty-days/ and the owner uses it daily with **real data on their iPhone**.

Changes and additions since SPEC.md:

- **PDF screen (`src/screens/Export.tsx`):** "Email PDFs" opens the share sheet on a phone (tap Mail). On a computer it downloads both PDFs and opens a work-Outlook compose link (`src/lib/email.ts`), because a website can't attach files to an email. There are also "Download both" and single-PDF buttons.
- **Backup (`src/lib/backup.ts`):** a JSON file with `app: 'duty-days'` and `version: 1`. Restore replaces everything after a confirm step. A banner shows when the last backup is 30+ days old.
- **Forms reminder (`src/lib/reminders.ts`):** paydays are every 2 weeks on Fridays, counted from `Settings.paydayAnchor`. A month's forms are due the Sunday before the first payday of the next month. The banner shows from 5 days before until that payday, and clears when the user emails or downloads both PDFs or taps Sent.
  - Open question: when that payday is on the 1st, forms come out due before the month ends (e.g. Dec 27, 2026). Confirm with the owner before changing this rule.
- **Year view (`src/screens/Year.tsx`):** `calculateYear` in `pay.ts` sums the 12 monthly results, so it always matches the forms.

## Releasing

- Pushing to `main` runs `.github/workflows/deploy.yml`: test, lint, build, and deploy to GitHub Pages. Installed apps update themselves on next open.
- **Bump `version` in package.json** on every user-visible change. The owner checks it at the bottom of Settings.
- **Database changes:** add a new `db.version(n)` in `src/db/db.ts`. Never edit an existing version, or the owner's data is at risk.
- Windows notes:
  - `gh` isn't on PATH; use `"C:\Program Files\GitHub CLI\gh.exe"`.
  - Commit with `git commit -F <message file>`. A PowerShell here-string message containing double quotes fails silently.

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

The repo is public. **No real names, pay rates, trip numbers, or the real payday in code or tests.** Personal values come from the setup and Settings screens and stay on the phone. Tests use made-up values: $50.00/hr, $68.27/hr for rounding, and a payday of 2026-10-16.

## Commands

- `npm run dev` — local dev server
- `npm test` — Vitest
- `npm run build` — production build
