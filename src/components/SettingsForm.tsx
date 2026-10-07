import { useState, type FormEvent } from 'react';
import { isValidDate, weekday } from '../lib/dates';
import { centsToInput, parseDollarsToCents } from '../lib/money';
import { Field } from './Field';
import type { Settings } from '../lib/types';

interface Props {
  initial: Settings;
  submitLabel: string;
  /** Show multiplier and soft day hours (Settings screen only). */
  showAdvanced?: boolean;
  onSave: (settings: Settings) => Promise<void>;
}

type Fields = Record<
  | 'pilotName'
  | 'hourlyRate'
  | 'defaultTail'
  | 'base'
  | 'domestic'
  | 'international'
  | 'accountingEmail'
  | 'multiplier'
  | 'softDayHours'
  | 'paydayAnchor',
  string
>;
type Errors = Partial<Record<keyof Fields, string>>;

function toFields(s: Settings): Fields {
  return {
    pilotName: s.pilotName,
    hourlyRate: s.hourlyRateCents > 0 ? centsToInput(s.hourlyRateCents) : '',
    defaultTail: s.defaultTail,
    base: s.base,
    domestic: centsToInput(s.domesticCents),
    international: centsToInput(s.internationalCents),
    accountingEmail: s.accountingEmail ?? '',
    multiplier: String(s.multiplier),
    softDayHours: String(s.softDayHours),
    paydayAnchor: s.paydayAnchor ?? '',
  };
}

function validate(f: Fields): { settings: Settings | null; errors: Errors } {
  const errors: Errors = {};
  const hourly = parseDollarsToCents(f.hourlyRate);
  const domestic = parseDollarsToCents(f.domestic);
  const international = parseDollarsToCents(f.international);
  const multiplier = Number(f.multiplier);
  const hours = Number(f.softDayHours);
  const email = f.accountingEmail.trim();

  if (!f.pilotName.trim()) errors.pilotName = 'Enter your name';
  if (hourly === null || hourly === 0) errors.hourlyRate = 'Enter your hourly rate, e.g. 50.00';
  if (!f.defaultTail.trim()) errors.defaultTail = 'Enter the tail you usually fly';
  if (!f.base.trim()) errors.base = 'Enter your base airport';
  if (domestic === null) errors.domestic = 'Enter an amount, e.g. 80';
  if (international === null) errors.international = 'Enter an amount, e.g. 100';
  if (!(multiplier > 0)) errors.multiplier = 'Enter a number, e.g. 1.5';
  if (!(hours > 0)) errors.softDayHours = 'Enter a number, e.g. 8';
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.accountingEmail = 'Check the email address';
  const payday = f.paydayAnchor.trim();
  if (payday && (!isValidDate(payday) || weekday(payday) !== 5)) {
    errors.paydayAnchor = 'Pick a Friday payday';
  }

  if (Object.keys(errors).length > 0) return { settings: null, errors };
  return {
    errors,
    settings: {
      pilotName: f.pilotName.trim(),
      hourlyRateCents: hourly!,
      defaultTail: f.defaultTail.trim().toUpperCase(),
      base: f.base.trim().toUpperCase(),
      domesticCents: domestic!,
      internationalCents: international!,
      multiplier,
      softDayHours: hours,
      ...(email ? { accountingEmail: email } : {}),
      ...(payday ? { paydayAnchor: payday } : {}),
    },
  };
}

export function SettingsForm({ initial, submitLabel, showAdvanced = false, onSave }: Props) {
  const [fields, setFields] = useState<Fields>(() => toFields(initial));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key: keyof Fields) => (value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { settings, errors } = validate(fields);
    setErrors(errors);
    if (!settings) return;
    setSaving(true);
    try {
      await onSave(settings);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend>You</legend>
        <Field label="Name" hint="Printed on the PDFs" error={errors.pilotName}>
          {(id) => (
            <input
              id={id}
              autoComplete="name"
              value={fields.pilotName}
              onChange={(e) => set('pilotName')(e.target.value)}
            />
          )}
        </Field>
        <Field label="Hourly rate" prefix="$" error={errors.hourlyRate}>
          {(id) => (
            <input
              id={id}
              inputMode="decimal"
              placeholder="0.00"
              value={fields.hourlyRate}
              onChange={(e) => set('hourlyRate')(e.target.value)}
            />
          )}
        </Field>
        <Field label="Default tail" hint="Prefilled on new trips" error={errors.defaultTail}>
          {(id) => (
            <input
              id={id}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={fields.defaultTail}
              onChange={(e) => set('defaultTail')(e.target.value)}
            />
          )}
        </Field>
        <Field label="Base" error={errors.base}>
          {(id) => (
            <input
              id={id}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={fields.base}
              onChange={(e) => set('base')(e.target.value)}
            />
          )}
        </Field>
      </fieldset>

      <fieldset>
        <legend>Per diem rates</legend>
        <Field label="Domestic" prefix="$" error={errors.domestic}>
          {(id) => (
            <input
              id={id}
              inputMode="decimal"
              value={fields.domestic}
              onChange={(e) => set('domestic')(e.target.value)}
            />
          )}
        </Field>
        <Field label="International" prefix="$" error={errors.international}>
          {(id) => (
            <input
              id={id}
              inputMode="decimal"
              value={fields.international}
              onChange={(e) => set('international')(e.target.value)}
            />
          )}
        </Field>
      </fieldset>

      {showAdvanced && (
        <fieldset>
          <legend>Soft day</legend>
          <Field label="Multiplier" hint="Hourly rate × this" error={errors.multiplier}>
            {(id) => (
              <input
                id={id}
                inputMode="decimal"
                value={fields.multiplier}
                onChange={(e) => set('multiplier')(e.target.value)}
              />
            )}
          </Field>
          <Field label="Hours per soft day" error={errors.softDayHours}>
            {(id) => (
              <input
                id={id}
                inputMode="decimal"
                value={fields.softDayHours}
                onChange={(e) => set('softDayHours')(e.target.value)}
              />
            )}
          </Field>
        </fieldset>
      )}

      <fieldset>
        <legend>Accounting</legend>
        <Field label="Email (optional)" error={errors.accountingEmail}>
          {(id) => (
            <input
              id={id}
              type="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={fields.accountingEmail}
              onChange={(e) => set('accountingEmail')(e.target.value)}
            />
          )}
        </Field>
        <Field
          label="A recent payday (optional)"
          hint="Any Friday payday. Paydays repeat every 2 weeks; this turns on the forms-due reminder."
          error={errors.paydayAnchor}
        >
          {(id) => (
            <input
              id={id}
              type="date"
              value={fields.paydayAnchor}
              onChange={(e) => set('paydayAnchor')(e.target.value)}
            />
          )}
        </Field>
      </fieldset>

      <button type="submit" className="button primary" disabled={saving}>
        {saving ? 'Saving…' : submitLabel}
      </button>
      {saved && showAdvanced && (
        <p className="form-status" role="status">
          Saved
        </p>
      )}
    </form>
  );
}
