# Duty Days — Per Diem & Soft Day Tracker

A personal iPhone app (installable web app / PWA) for a Part 135 pilot to log trips, mark scheduled days off, and generate two monthly PDFs for accounting: **Per Diem** and **Soft Day**.

Single user. Free to run. Data lives only on the phone.

---

## 1. Goals

- Log a whole trip once (start date → return date) instead of day by day.
- Mark scheduled days off for each month (they change every month).
- Calculate per diem and soft day pay automatically, using the rules in section 3.
- Generate two PDFs per month and send them through the iPhone share sheet (Mail, Messages, Files).
- Work offline. Install to the iPhone home screen. Cost nothing.

**Not in v1:** accounts/login, a server, syncing between devices, JetInsight integration (see section 10).

---

## 2. Tech stack

| Piece   | Choice                                                  | Why                                                   |
| ------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Build   | Vite + React + TypeScript                               | Fast, simple, well known                              |
| Styling | Plain CSS with CSS variables (or Tailwind if preferred) | Keep it light                                         |
| Storage | IndexedDB via **Dexie**                                 | Survives app restarts; more durable than localStorage |
| PDF     | **jsPDF** (draw tables by hand, no plugin needed)       | Runs on the phone, no server                          |
| PWA     | **vite-plugin-pwa**                                     | Manifest + service worker for offline + install       |
| Tests   | **Vitest**                                              | Pay rules must be tested before UI is built           |
| Hosting | **GitHub Pages**, deployed by a GitHub Actions workflow | Free                                                  |

### Privacy rule for the repo

Free GitHub Pages needs a **public** repo. So:

- **No personal data in the code.** No real name, hourly rate, or trip numbers hard-coded anywhere — including tests.
- Name, hourly rate, rates, base, and default tail are entered on a **first-run setup screen** and stored on the phone only.
- Tests use made-up names and rates (see section 9).

---

## 3. Pay rules (the core of the app)

Put all of this in one pure module: `src/lib/pay.ts`. No React, no database — plain functions that take trips + days off + settings and return results. **Build and test this first.**

### 3.1 Money

- Do all math in **integer cents**. Format to dollars only for display.
- Soft day rate: round `hourlyRate × multiplier` to the cent **first**, then multiply by hours.
  - Example: $76.92 × 1.5 = $115.38 → × 8 = **$923.04 per day**.

### 3.2 Trips → duty days

- A trip covers **every calendar date from start date through return date, inclusive**.
  - Example: depart Sep 7, return Sep 14 → 8 duty days.
- A same-day trip (start = return) is 1 duty day.
- All trip kinds earn per diem: **Charter, Training, Positioning, Aircraft pickup**.

### 3.3 Per diem rate for each day

Each trip day has a location type: **Domestic ($80)** or **International ($100)** (amounts come from Settings).

- **Rule: the rate is set by where the day's last leg ends.** K-prefix airport = Domestic. Anything else = International.
- **Overnight days** (every day except the return day): the type of where you slept.
- **Return day:** takes the type of the **previous night**. (Coming home from an international layover pays International, even though the last leg ends at base.)
- **Same-day trip:** always **Domestic**, even if the destination was international (no overnight).
- **Mixed trips** (some nights domestic, some international): each day follows its own night per the rules above.
- Every day allows a **manual amount override** for edge cases. If set, it wins.

**In the UI:** the trip has one Domestic/International toggle that sets all days. The trip's day list lets the user flip any single night. The return day and same-day trips are calculated automatically (shown, not editable, except via override).

### 3.4 One per diem per date

- A date can only be paid once, even if two trips touch it (land at base and leave again the same day).
- If two trips share a date, pay the **higher** of the two rates once.

### 3.5 Soft day pay

- Days off are a set of dates the user marks per month.
- **Any duty day that falls on a day off earns soft day pay** — flying, layover, training, positioning, pickup all count.
- Soft day pay = `hours (8) × round(hourlyRate × 1.5)` = one flat amount per day, no matter how long the day was.
- A worked day off **also** earns that day's per diem. They stack.
- One soft day pay per date maximum.

### 3.6 Months

- Each date belongs to its own calendar month.
- A trip that crosses months is **split**: Sep 28 – Oct 2 puts Sep 28–30 on September's forms and Oct 1–2 on October's.
- The PDF for a month should note any trip that continues into the next month or started in the previous one.

### 3.7 Day status (for the Soft Day PDF)

Each trip day has a status: **Flying** or **Layover**.

- Default: first and last day = Flying, days in between = Layover.
- Single-day trip = Flying.
- User can change any day.

---

## 4. Data model

```ts
// Stored once
interface Settings {
  pilotName: string; // e.g. "First Last" — entered on first run
  base: string; // "KFXE" — default, editable
  hourlyRateCents: number; // entered on first run
  multiplier: number; // 1.5
  softDayHours: number; // 8
  domesticCents: number; // 8000
  internationalCents: number; // 10000
  defaultTail: string; // entered on first run
  accountingEmail?: string;
}

type TripKind = 'charter' | 'training' | 'positioning' | 'pickup';
type LocType = 'domestic' | 'international';
type DayStatus = 'flying' | 'layover';

interface Trip {
  id: string;
  startDate: string; // 'YYYY-MM-DD' (local date, never a timestamp)
  endDate: string; // 'YYYY-MM-DD', >= startDate
  tripNumber: string; // e.g. "E1EZ8G"
  tail: string;
  kind: TripKind;
  defaultLoc: LocType; // the trip-level toggle
  customer?: string;
  notes?: string;
  dayOverrides: Record<
    string,
    {
      // keyed by date
      loc?: LocType; // flips a single night
      status?: DayStatus;
      amountCents?: number; // manual per diem override
    }
  >;
  createdAt: number;
  updatedAt: number;
}

interface MonthDaysOff {
  month: string; // 'YYYY-MM'
  dates: string[]; // ['2026-09-08', ...]
}
```

### Calculated output (from `pay.ts`)

```ts
interface DayResult {
  date: string;
  tripIds: string[];
  tripNumber: string; // if 2 trips, join with " / "
  tail: string;
  loc: LocType;
  status: DayStatus;
  perDiemCents: number;
  isDayOff: boolean;
  softDayCents: number; // 0 unless worked on a day off
}

interface MonthResult {
  month: string; // 'YYYY-MM'
  days: DayResult[]; // only duty days, sorted
  daysOff: string[];
  perDiemTotalCents: number;
  domesticDays: number;
  internationalDays: number;
  softDayCount: number;
  softDayRateCents: number; // e.g. 92304
  softDayTotalCents: number;
  carryNotes: string[]; // "Trip 3Q1N53 (Sep 28 – Oct 2): Oct 1–2 on October form"
}
```

### Dates

- Store dates as `'YYYY-MM-DD'` strings. **Never** use `new Date('2026-09-07')` for logic — it parses as UTC and can shift a day in Florida. Write small helpers (`addDays`, `eachDate`, `monthOf`, `weekday`) that work on the strings.

---

## 5. Screens

Phone-first, one hand, big tap targets (min 44px). Support light and dark mode. Respect iPhone safe areas (notch / home bar). Inputs at least 16px font so iOS doesn't zoom.

### 5.1 First-run setup

Shown when no Settings exist. Fields: name, hourly rate, default tail, base (prefilled KFXE), domestic rate (80), international rate (100), accounting email (optional). Save → Month screen.

### 5.2 Month screen (home)

- **Header:** `‹  September 2026  ›` month switcher.
- **Totals strip:** Per Diem $ (days) · Soft Day $ (days).
- **Calendar grid** (Sun–Sat):
  - Trip day: filled color (one color for domestic, a second for international).
  - Day off: gray / hatched.
  - **Worked day off:** distinct highlight (e.g. amber ring) — these are the money days, make them obvious.
  - Today: outlined.
- **Two modes**, switched by a segmented control above the calendar:
  - **Trips** (default): tap a trip day → open that trip. Tap an empty day → new trip starting that day.
  - **Days off:** tap days to toggle off/on. Fast multi-tap. "Done" returns to Trips mode.
- **Trip list** under the calendar: each trip as a row — dates, trip #, kind, Dom/Intl, $ amount for this month.
- **Buttons:** `+ Add trip` and `Make PDFs`.

### 5.3 Trip editor (bottom sheet or full screen)

- Start date, return date (defaults to start), trip # , tail (default from settings), kind, Domestic/International toggle, customer (optional), notes (optional).
- **Day list** below: one row per date — date, weekday, Flying/Layover toggle, Dom/Intl (editable on overnight days only), amount, "day off" badge if it lands on a day off. Tap amount to override.
- Live totals for the trip.
- Warn (don't block) if it overlaps another trip.
- Delete trip (with confirm).

### 5.4 Export screen

- Month summary: per diem total and day counts, soft day total and count, carry-over notes.
- Two buttons: **Share Per Diem PDF**, **Share Soft Day PDF**. Plus **Share both**.
- Uses `navigator.share({ files })` (works on iOS Safari). Fallback: download.
- If soft day total is $0, still allow generating it (accounting may want it) but show "No soft days this month".

### 5.5 Settings

- All Settings fields.
- **Backup:** export everything to a JSON file (share sheet → save to Files / email to self). **Restore:** import that JSON.
- Show "Last backup: date". Remind if older than 30 days.
- App version.

---

## 6. PDFs

Two separate files per month. Letter size, portrait. Clean, generic, no company logo.

**File names:**

- `First_Last_Per_Diem_September_2026.pdf`
- `First_Last_Soft_Day_September_2026.pdf`

### 6.1 Per Diem PDF

- Title: **"{Name} Per Diem"**, subtitle **"{Month} {Year}"**. Top right: Base, and rates (Domestic $80.00 / International $100.00).
- Table with **every day of the month** (28–31 rows): Date · Day · Aircraft Tail # · Trip # · Type (Domestic/International) · Amount.
  - Duty days: shaded row, all columns filled.
  - Non-duty days: muted, empty columns.
- Under the table: `Domestic: N days × $80.00 = $X`, `International: N days × $100.00 = $Y`, and bold **Total Per Diem: $Z**.
- Carry-over notes in small italics.
- Footer: total days, generated date.
- Must fit on one page for a 31-day month.

### 6.2 Soft Day PDF

- Title: **"{Name} Soft Day"**, subtitle **"{Month} {Year}"**.
- Table with every day of the month: Date · Day · Day Off? · Status (Flying/Layover) · Trip # · Aircraft Tail # · Amount.
  - Worked days off: shaded, amount shown.
  - Days off not worked: show "Off", no amount.
  - Other days: muted.
- Calculation block: `Hourly rate $76.92 × 1.5 = $115.38 × 8 hrs = $923.04 per day` then `$923.04 × N days = **$Total**`.
- Footer like the per diem PDF.

The September 2026 per diem PDF already made in chat is the visual reference for layout.

---

## 7. PWA / iPhone

- `manifest.webmanifest`: name "Duty Days", `display: standalone`, theme color, icons 192/512 + `apple-touch-icon` 180.
- Service worker (vite-plugin-pwa, `registerType: 'autoUpdate'`) caches the app for offline.
- `<meta name="apple-mobile-web-app-capable" content="yes">` and status bar style.
- Call `navigator.storage.persist()` on first run.
- Vite `base` must match the repo name for GitHub Pages (e.g. `base: '/duty-days/'`).
- **Install note:** the home-screen app has its own storage, separate from Safari. Install first, then enter data.

---

## 8. Build order

Do one phase at a time. Stop after each phase so it can be checked.

1. **Project setup.** Vite + React + TS, Vitest, ESLint, Prettier. Git init. Folder structure:
   ```
   src/lib/dates.ts      date helpers
   src/lib/pay.ts        pay rules (pure)
   src/lib/pdf.ts        PDF generation
   src/db/               Dexie schema + queries
   src/screens/          Month, TripEditor, Export, Settings, Setup
   src/components/       Calendar, TotalsStrip, etc.
   ```
2. **Pay engine + tests.** `dates.ts` and `pay.ts` with all tests in section 9 passing. No UI yet.
3. **Database + settings.** Dexie schema, first-run setup screen, settings screen.
4. **Month screen.** Calendar, totals, days-off mode, trip list.
5. **Trip editor.** Create/edit/delete, day list, overrides.
6. **PDFs + sharing.** Both PDFs, export screen, share sheet.
7. **PWA + deploy.** Manifest, icons, service worker, GitHub Actions workflow to Pages. Install on iPhone.
8. **Backup/restore** and the 30-day backup reminder.
9. **Real check:** enter September 2026 on the phone and confirm the totals match section 9.1.

---

## 9. Test cases (Vitest)

Tests use made-up names. Use these settings unless a test says otherwise: domestic $80, international $100, multiplier 1.5, 8 hours, hourly rate **$50.00** (→ $75.00 × 8 = **$600.00** per soft day).

### 9.1 September 2026 (real shape, generic data)

Days off: Sep 8–12, Sep 20–26.

| Trip | Dates          | Type                |
| ---- | -------------- | ------------------- |
| A    | Sep 4–7        | International       |
| B    | Sep 13–17      | Domestic            |
| C    | Sep 27         | Domestic (same day) |
| D    | Sep 28 – Oct 2 | Domestic            |

Expect September: **13 duty days**, 9 domestic + 4 international, **per diem $1,120.00**, **0 soft days, $0.00**, one carry note for trip D.
Expect October (from trip D only): 2 days, $160.00.

### 9.2 February 2026 (matches the old paper form)

Days off include: Feb 7, 8, 24, 25, 26.

| Trip | Dates     | Type                      |
| ---- | --------- | ------------------------- |
| A    | Feb 1     | Domestic (same day)       |
| B    | Feb 7–8   | Domestic                  |
| C    | Feb 12–16 | International             |
| D    | Feb 18–19 | Domestic                  |
| E    | Feb 24–26 | Domestic (25th = Layover) |

Expect: **13 duty days**, per diem **$1,140.00** (8 × $80 + 5 × $100). Soft days: **5** (7, 8, 24, 25, 26) → 5 × $600 = **$3,000.00**.
Also: with hourly $76.92, soft day rate = **$923.04** and 5 days = **$4,615.20** (a pure-math test of the rounding rule; put the numbers only in the test, not in app defaults).

### 9.3 Rule edge cases

- Same-day trip to an international airport → **$80**.
- International trip Mar 1–3 → Mar 1 $100, Mar 2 $100, Mar 3 (return) **$100**.
- Mixed trip Mar 1–4, nights: Mar 1 dom, Mar 2 intl, Mar 3 intl → Mar 4 return takes intl → $80 + $100 + $100 + $100.
- Back-to-back: trip X Mar 1–3 international, trip Y starts Mar 3 domestic overnight → Mar 3 paid **once at $100**.
- Manual override amount on a day wins over the rule.
- Trip day on a day off → both per diem and soft day pay for that date.
- Two trips on the same day off → soft day paid **once**.
- Training / positioning / pickup kinds earn per diem exactly like charter.
- Date helpers: adding days across month and year ends; no time-zone shift for dates in America/New_York.

---

## 10. Later (not v1)

- **JetInsight import.** Ask dispatch whether they can provide an iCal (.ics) feed filtered to this pilot. If yes: a tiny free Cloudflare Worker fetches it (browsers block direct cross-site fetches), the app reads events, and suggests trips for the user to confirm. Never store JetInsight login credentials.
- Month-end reminder banner before the accounting deadline (forms due the Sunday before the Friday payday).
- Year view with yearly totals.
- Duplicate last trip / "same as last time" quick add.
