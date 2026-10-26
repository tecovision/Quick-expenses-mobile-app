import { parseSharedReceipt } from './receiptParser';

describe('parseSharedReceipt', () => {
  it('extracts a ₹-prefixed amount and a "paid to" description', () => {
    const r = parseSharedReceipt(
      'You paid ₹500 to John Doe on 15 Oct 2026, 10:32 am\nUTR: 123456789012'
    );
    expect(r.amount).toBe(500);
    expect(r.particular).toBe('Paid to John Doe');
    expect(r.note).toContain('UTR: 123456789012');
  });

  it('handles comma-grouped and decimal amounts', () => {
    expect(parseSharedReceipt('Paid ₹1,234.50 to Store').amount).toBe(1234.5);
  });

  it('recognizes "Rs." and "INR" amount prefixes', () => {
    expect(parseSharedReceipt('You paid Rs. 99 to Vendor').amount).toBe(99);
    expect(parseSharedReceipt('You paid INR 250 to Vendor').amount).toBe(250);
  });

  it('extracts a "received from" description', () => {
    const r = parseSharedReceipt('You received ₹200 from Jane Smith on 1 Jan 2026');
    expect(r.amount).toBe(200);
    expect(r.particular).toBe('Received from Jane Smith');
  });

  it('leaves particular blank when no recognizable pattern is present', () => {
    const r = parseSharedReceipt('Transaction of ₹75 completed successfully.');
    expect(r.amount).toBe(75);
    expect(r.particular).toBe('');
  });

  it('leaves amount null when no amount is present', () => {
    const r = parseSharedReceipt('Thanks for using the app!');
    expect(r.amount).toBeNull();
    expect(r.particular).toBe('');
  });

  it('always preserves the full original text as the note', () => {
    const raw = 'Some unrelated shared text with no amount at all';
    expect(parseSharedReceipt(raw).note).toBe(raw);
  });

  it('rejects a zero or negative-looking amount', () => {
    expect(parseSharedReceipt('You paid ₹0 to Nobody').amount).toBeNull();
  });

  it('caps a pathologically long shared text instead of scanning it in full', () => {
    // Worst case for the lazy-quantifier + lookahead patterns: a huge run of
    // plain spaces that never satisfies the lookahead and never hits a
    // comma/newline either, so the engine would otherwise walk the entire
    // string one character at a time.
    const huge = 'paid to ' + ' '.repeat(2_000_000);
    const start = Date.now();
    const r = parseSharedReceipt(huge);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(r.note.length).toBeLessThanOrEqual(4000);
  });
});
