/**
 * Console design tokens — VERA editorial light system (docs/design-system.md).
 * Class strings only, so Tailwind JIT sees every class.
 */

export const card =
  'rounded-xl border border-line bg-white shadow-card';

export const cardHeader =
  'flex items-center justify-between gap-3 px-5 pt-5 pb-0';

export const sectionLabel =
  'font-mono text-[11px] font-medium uppercase tracking-wider text-mute';

export const btnPrimary =
  'inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50';

export const btnSecondary =
  'inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-card transition hover:border-line-strong hover:bg-mist disabled:opacity-50';

export const btnDanger =
  'inline-flex items-center gap-2 rounded-lg bg-bad px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-bad/90 disabled:opacity-50';

export const input =
  'w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10';

export const labelText = 'text-[13px] font-medium text-ink';

/** Tone-tinted icon square for stat cards. */
export const toneClasses: Record<string, { box: string; text: string; chipUp: string; chipDown: string }> = {
  indigo: { box: 'bg-accent-faint text-accent', text: 'text-accent', chipUp: 'bg-ok-soft text-ok', chipDown: 'bg-bad-soft text-bad' },
  emerald: { box: 'bg-ok-soft text-ok', text: 'text-ok', chipUp: 'bg-ok-soft text-ok', chipDown: 'bg-bad-soft text-bad' },
  amber: { box: 'bg-warn-soft text-warn', text: 'text-warn', chipUp: 'bg-ok-soft text-ok', chipDown: 'bg-bad-soft text-bad' },
  sky: { box: 'bg-accent-soft text-accent-deep', text: 'text-accent-deep', chipUp: 'bg-ok-soft text-ok', chipDown: 'bg-bad-soft text-bad' },
  rose: { box: 'bg-bad-soft text-bad', text: 'text-bad', chipUp: 'bg-ok-soft text-ok', chipDown: 'bg-bad-soft text-bad' },
};

/** Light-theme status pills for pothole report lifecycle (design-system.md §4 semantics). */
export const statusPill: Record<string, string> = {
  OPEN: 'bg-warn-soft text-warn border-warn/20',
  CONFIRMED: 'bg-accent-faint text-accent-deep border-accent/20',
  ESCALATED: 'bg-lav-soft text-lav-deep border-lav-deep/20',
  REPAIR_SUBMITTED: 'bg-violet-50 text-violet-700 border-violet-200',
  VERIFIED: 'bg-ok-soft text-ok border-ok/20',
  PAID: 'bg-ok-soft text-ok border-ok/20',
  REJECTED: 'bg-bad-soft text-bad border-bad/20',
  ACTIVE: 'bg-accent-faint text-accent-deep border-accent/20',
  COMPLETED: 'bg-ok-soft text-ok border-ok/20',
};

export const pill = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium';
