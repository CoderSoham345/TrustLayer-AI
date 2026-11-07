import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CSV_BOM, escapeCsvField, sanitizeCsvValue, toCsv } from '../src/utils/csv';

test('escapeCsvField leaves plain values untouched', () => {
  assert.equal(escapeCsvField('hello world'), 'hello world');
});

test('escapeCsvField quotes commas, quotes and line breaks', () => {
  assert.equal(escapeCsvField('a,b'), '"a,b"');
  assert.equal(escapeCsvField('say "hi"'), '"say ""hi"""');
  assert.equal(escapeCsvField('line1\nline2'), '"line1\nline2"');
  assert.equal(escapeCsvField('line1\r\nline2'), '"line1\r\nline2"');
});

test('sanitizeCsvValue prefixes formula triggers with a single quote', () => {
  for (const trigger of ['=', '+', '-', '@', '\t', '\r']) {
    assert.equal(sanitizeCsvValue(`${trigger}SUM(A1)`), `'${trigger}SUM(A1)`);
  }
  assert.equal(sanitizeCsvValue('a=b'), 'a=b');
});

test('sanitizeCsvValue checks the first non-whitespace character', () => {
  assert.equal(sanitizeCsvValue(' =1+1'), "' =1+1");
  assert.equal(sanitizeCsvValue('   @SUM(A1)'), "'   @SUM(A1)");
  assert.equal(sanitizeCsvValue('\n-2'), "'\n-2");
  assert.equal(sanitizeCsvValue('  plain text'), '  plain text');
  assert.equal(sanitizeCsvValue('   '), '   ');
});

test('sanitizeCsvValue formats non-string values', () => {
  assert.equal(sanitizeCsvValue(null), '');
  assert.equal(sanitizeCsvValue(undefined), '');
  assert.equal(sanitizeCsvValue(42.5), '42.5');
  assert.equal(sanitizeCsvValue(false), 'false');
  assert.equal(sanitizeCsvValue(new Date('2026-01-02T03:04:05.000Z')), '2026-01-02T03:04:05.000Z');
});

test('toCsv writes a BOM, header row and CRLF-separated rows', () => {
  const csv = toCsv(['id', 'question'], [
    ['1', 'Plain'],
    ['2', '=HYPERLINK("http://x", "a, b")\nnext'],
  ]);
  assert.ok(csv.startsWith(CSV_BOM));
  assert.equal(
    csv.slice(CSV_BOM.length),
    'id,question\r\n1,Plain\r\n2,"\'=HYPERLINK(""http://x"", ""a, b"")\nnext"\r\n'
  );
});
