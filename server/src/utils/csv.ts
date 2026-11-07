export type CsvValue = string | number | boolean | Date | null | undefined;

// UTF-8 byte order mark so Excel detects the encoding of non-English text
export const CSV_BOM = '﻿';

// Characters that spreadsheet apps interpret as the start of a formula (CSV injection).
// These are checked after leading whitespace, since some apps trim it before evaluating.
const FORMULA_TRIGGERS = ['=', '+', '-', '@'];
// Control characters that are dangerous as the very first character
const LEADING_CONTROL_TRIGGERS = ['\t', '\r'];

// Convert a value to text and neutralise formula injection by prefixing a single quote
export function sanitizeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'string') return String(value);

  const firstNonWhitespace = value.trimStart().charAt(0);
  if (LEADING_CONTROL_TRIGGERS.includes(value.charAt(0)) || FORMULA_TRIGGERS.includes(firstNonWhitespace)) {
    return `'${value}`;
  }
  return value;
}

// RFC 4180: quote fields containing commas, quotes or line breaks, doubling inner quotes
export function escapeCsvField(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map((value) => escapeCsvField(sanitizeCsvValue(value))).join(',')
  );
  return CSV_BOM + lines.join('\r\n') + '\r\n';
}
