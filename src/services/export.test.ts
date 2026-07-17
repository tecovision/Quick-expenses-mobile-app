import { safeFileName, escapeHtml, csvCell } from './export';

describe('escapeHtml', () => {
  it('neutralizes a script tag injected via a file or expense name', () => {
    const out = escapeHtml('<script>alert(1)</script>');
    expect(out).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out).not.toContain('<script>');
  });

  it('escapes attribute-breaking quotes', () => {
    expect(escapeHtml('" onerror="x')).toBe('&quot; onerror=&quot;x');
  });

  it('escapes ampersands first so entities are not double-broken', () => {
    expect(escapeHtml('a & <b>')).toBe('a &amp; &lt;b&gt;');
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeHtml('Office supplies 2024')).toBe('Office supplies 2024');
  });
});

describe('csvCell', () => {
  it('quotes ordinary values', () => {
    expect(csvCell('Taxi fare')).toBe('"Taxi fare"');
  });

  it('escapes embedded double quotes by doubling them', () => {
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
  });

  it('keeps commas and newlines contained within the quoted cell', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  // Formula injection: Excel/Sheets execute cells starting with = + - @
  it.each(['=1+1', '+1', '-1', '@SUM(A1)'])(
    'neutralizes formula injection for %s',
    (payload) => {
      const out = csvCell(payload);
      expect(out).toBe(`"'${payload}"`);
    }
  );

  it('neutralizes a classic command-execution payload', () => {
    const out = csvCell('=cmd|\' /C calc\'!A0');
    expect(out.startsWith('"\'=')).toBe(true);
  });

  it('does not prefix values that merely contain an operator', () => {
    expect(csvCell('10-20 range')).toBe('"10-20 range"');
  });
});

describe('safeFileName', () => {
  it('strips path traversal sequences', () => {
    const out = safeFileName('../../etc/passwd');
    expect(out).not.toContain('..');
    expect(out).not.toContain('/');
  });

  it('replaces spaces with underscores', () => {
    expect(safeFileName('My Expenses 2024')).toBe('My_Expenses_2024');
  });

  it('falls back when the name has no usable characters', () => {
    expect(safeFileName('///')).toBe('expense_file');
    expect(safeFileName('')).toBe('expense_file');
  });

  it('caps the length', () => {
    expect(safeFileName('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});
