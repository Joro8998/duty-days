// Per Diem and Soft Day PDFs (SPEC.md section 6). Letter, portrait, one page.
// Layout only: every amount comes from pay.ts.

import { jsPDF } from 'jspdf';
import { datesInMonth, longDate, monthLabel, monthName, usDate, weekdayName } from './dates';
import { LOC_LABELS, STATUS_LABELS } from './labels';
import { formatCents } from './money';
import { perDiemBreakdown, softDayBreakdown } from './pay';
import type { MonthResult, Settings } from './types';

type Rgb = [number, number, number];

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const RIGHT = PAGE_W - MARGIN;
const TABLE_TOP = 100;
const HEADER_H = 18;
const ROW_H = 16;
const FOOTER_Y = PAGE_H - 28;

const INK: Rgb = [28, 28, 30];
const SUBTLE: Rgb = [90, 90, 96];
const MUTED: Rgb = [165, 165, 170];
const LINE: Rgb = [212, 212, 218];
const HEADER_FILL: Rgb = [58, 58, 64];
const DUTY_FILL: Rgb = [226, 235, 249];
const OFF_FILL: Rgb = [242, 242, 244];

type RowStyle = 'duty' | 'off' | 'muted';

interface Column {
  header: string;
  width: number;
  align?: 'left' | 'right';
}

interface Row {
  cells: string[];
  style: RowStyle;
}

export type PdfKind = 'perDiem' | 'softDay';

/** `First_Last_Per_Diem_September_2026.pdf` */
export function pdfFileName(pilotName: string, kind: PdfKind, month: string): string {
  const name =
    pilotName
      .trim()
      .split(/\s+/)
      .map((part) => part.replace(/[^\p{L}\p{N}-]/gu, ''))
      .filter(Boolean)
      .join('_') || 'Duty_Days';
  const label = kind === 'perDiem' ? 'Per_Diem' : 'Soft_Day';
  return `${name}_${label}_${monthName(month)}_${month.slice(0, 4)}.pdf`;
}

export function perDiemPdf(result: MonthResult, settings: Settings, generatedOn: string): jsPDF {
  const doc = newDoc(`${settings.pilotName} Per Diem ${monthLabel(result.month)}`);
  drawTitle(doc, `${settings.pilotName} Per Diem`, monthLabel(result.month), [
    `Base: ${settings.base}`,
    `Domestic ${formatCents(settings.domesticCents)} / International ${formatCents(settings.internationalCents)}`,
  ]);

  const byDate = new Map(result.days.map((d) => [d.date, d]));
  const rows: Row[] = datesInMonth(result.month).map((date) => {
    const d = byDate.get(date);
    const lead = [usDate(date), weekdayName(date)];
    if (!d) return { cells: [...lead, '', '', '', ''], style: 'muted' };
    return {
      cells: [...lead, d.tail, d.tripNumber, LOC_LABELS[d.loc], formatCents(d.perDiemCents)],
      style: 'duty',
    };
  });

  let y = drawTable(
    doc,
    [
      { header: 'Date', width: 74 },
      { header: 'Day', width: 82 },
      { header: 'Aircraft Tail #', width: 100 },
      { header: 'Trip #', width: 100 },
      { header: 'Type', width: 96 },
      { header: 'Amount', width: 80, align: 'right' },
    ],
    rows,
  );

  const b = perDiemBreakdown(result, settings);
  y += 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setText(doc, INK);
  const lines = [
    `Domestic: ${days(b.domestic.days)} × ${formatCents(b.domestic.rateCents)} = ${formatCents(b.domestic.subtotalCents)}`,
    `International: ${days(b.international.days)} × ${formatCents(b.international.rateCents)} = ${formatCents(b.international.subtotalCents)}`,
  ];
  if (b.adjustmentCents !== 0) {
    const sign = b.adjustmentCents > 0 ? '+' : '';
    lines.push(`Manual adjustments: ${sign}${formatCents(b.adjustmentCents)}`);
  }
  for (const line of lines) {
    doc.text(clean(line), RIGHT, y, { align: 'right' });
    y += 15;
  }
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(`Total Per Diem: ${formatCents(b.totalCents)}`, RIGHT, y, { align: 'right' });

  drawCarryNotes(doc, result.carryNotes, y + 24);
  drawFooter(doc, `Total days: ${result.days.length}`, generatedOn);
  return doc;
}

export function softDayPdf(result: MonthResult, settings: Settings, generatedOn: string): jsPDF {
  const doc = newDoc(`${settings.pilotName} Soft Day ${monthLabel(result.month)}`);
  drawTitle(doc, `${settings.pilotName} Soft Day`, monthLabel(result.month), [
    `Base: ${settings.base}`,
  ]);

  const byDate = new Map(result.days.map((d) => [d.date, d]));
  const off = new Set(result.daysOff);
  const rows: Row[] = datesInMonth(result.month).map((date) => {
    const d = byDate.get(date);
    const isOff = off.has(date);
    const lead = [usDate(date), weekdayName(date), isOff ? 'Yes' : ''];
    if (d && isOff) {
      return {
        cells: [
          ...lead,
          STATUS_LABELS[d.status],
          d.tripNumber,
          d.tail,
          formatCents(d.softDayCents),
        ],
        style: 'duty',
      };
    }
    if (isOff) return { cells: [...lead, 'Off', '', '', ''], style: 'off' };
    if (d)
      return {
        cells: [...lead, STATUS_LABELS[d.status], d.tripNumber, d.tail, ''],
        style: 'muted',
      };
    return { cells: [...lead, '', '', '', ''], style: 'muted' };
  });

  let y = drawTable(
    doc,
    [
      { header: 'Date', width: 70 },
      { header: 'Day', width: 78 },
      { header: 'Day Off?', width: 60 },
      { header: 'Status', width: 66 },
      { header: 'Trip #', width: 92 },
      { header: 'Aircraft Tail #', width: 86 },
      { header: 'Amount', width: 80, align: 'right' },
    ],
    rows,
  );

  const s = softDayBreakdown(settings);
  y += 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setText(doc, INK);
  doc.text(
    `Hourly rate ${formatCents(s.hourlyRateCents)} × ${s.multiplier} = ${formatCents(s.perHourCents)} × ${s.hours} hrs = ${formatCents(s.perDayCents)} per day`,
    RIGHT,
    y,
    { align: 'right' },
  );
  y += 19;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(
    `${formatCents(s.perDayCents)} × ${days(result.softDayCount)} = ${formatCents(result.softDayTotalCents)}`,
    RIGHT,
    y,
    { align: 'right' },
  );
  if (result.softDayCount === 0) {
    y += 15;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    setText(doc, SUBTLE);
    doc.text('No soft days this month.', RIGHT, y, { align: 'right' });
  }

  drawCarryNotes(doc, result.carryNotes, y + 24);
  drawFooter(doc, `Soft days: ${result.softDayCount}`, generatedOn);
  return doc;
}

// ---------- drawing helpers ----------

function newDoc(title: string): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
  doc.setProperties({ title: clean(title), creator: 'Duty Days' });
  doc.setLineHeightFactor(1.2);
  return doc;
}

function drawTitle(doc: jsPDF, title: string, subtitle: string, rightLines: string[]) {
  setText(doc, INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(clean(title), MARGIN, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  setText(doc, SUBTLE);
  doc.text(subtitle, MARGIN, 76);

  doc.setFontSize(9.5);
  rightLines.forEach((line, i) => {
    doc.text(clean(line), RIGHT, 50 + i * 13, { align: 'right' });
  });
}

/** Draws the table and returns the y of its bottom edge. */
function drawTable(doc: jsPDF, columns: Column[], rows: Row[]): number {
  let y = TABLE_TOP;

  doc.setFillColor(...HEADER_FILL);
  doc.rect(MARGIN, y, CONTENT_W, HEADER_H, 'F');
  doc.setFont('helvetica', 'bold');
  setText(doc, [255, 255, 255]);
  drawCells(
    doc,
    columns,
    columns.map((c) => c.header),
    y + HEADER_H / 2,
    9,
  );
  y += HEADER_H;

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.5);
  for (const row of rows) {
    if (row.style !== 'muted') {
      doc.setFillColor(...(row.style === 'duty' ? DUTY_FILL : OFF_FILL));
      doc.rect(MARGIN, y, CONTENT_W, ROW_H, 'F');
    }
    doc.setFont('helvetica', row.style === 'duty' ? 'bold' : 'normal');
    setText(doc, row.style === 'muted' ? MUTED : row.style === 'off' ? SUBTLE : INK);
    drawCells(doc, columns, row.cells, y + ROW_H / 2, 9);
    y += ROW_H;
    doc.line(MARGIN, y, RIGHT, y);
  }

  doc.rect(MARGIN, TABLE_TOP, CONTENT_W, y - TABLE_TOP, 'S');
  return y;
}

function drawCells(doc: jsPDF, columns: Column[], cells: string[], yMid: number, size: number) {
  let x = MARGIN;
  columns.forEach((col, i) => {
    const text = clean(cells[i] ?? '');
    if (text) {
      // Shrink long values (e.g. two trips on one date) to fit the column.
      let s = size;
      doc.setFontSize(s);
      while (s > 6 && doc.getTextWidth(text) > col.width - 10) {
        s -= 0.5;
        doc.setFontSize(s);
      }
      const tx = col.align === 'right' ? x + col.width - 6 : x + 6;
      doc.text(text, tx, yMid, { align: col.align ?? 'left', baseline: 'middle' });
    }
    x += col.width;
  });
  doc.setFontSize(size);
}

function drawCarryNotes(doc: jsPDF, notes: string[], top: number) {
  if (notes.length === 0) return;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  setText(doc, SUBTLE);
  let y = top;
  for (const note of notes) {
    const wrapped = doc.splitTextToSize(clean(`Note: ${note}`), CONTENT_W) as string[];
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 11;
  }
}

function drawFooter(doc: jsPDF, left: string, generatedOn: string) {
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, FOOTER_Y - 12, RIGHT, FOOTER_Y - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setText(doc, SUBTLE);
  doc.text(left, MARGIN, FOOTER_Y);
  doc.text(`Generated ${longDate(generatedOn)}`, RIGHT, FOOTER_Y, { align: 'right' });
}

function setText(doc: jsPDF, rgb: Rgb) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

/** The built-in PDF fonts only cover Latin-1, so swap typographic dashes and quotes. */
function clean(text: string): string {
  return text.replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}
