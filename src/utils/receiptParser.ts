import { parseAmount } from './helpers';

export interface ParsedReceipt {
  /** Rounded, validated amount, or null if none could be found/parsed. */
  amount: number | null;
  /** Best-effort description (e.g. "Paid to John Doe") — blank if unclear. */
  particular: string;
  /** The full, unmodified shared text, kept as the expense's note. */
  note: string;
}

// Matches "₹500", "Rs. 500", "Rs 500", "INR 500", with optional thousands
// separators and a decimal part — the formats PhonePe and similar UPI apps
// use in their shared transaction summaries.
const AMOUNT_PATTERN = /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i;

const PAID_TO_PATTERN = /paid\s+(?:(?:₹|Rs\.?|INR)\s*[\d,.]+\s*)?(?:to|towards)\s+([^\n,]+?)(?=\s+(?:on|using|via|at)\b|[.\n]|$)/i;
const RECEIVED_FROM_PATTERN = /received\s+(?:(?:₹|Rs\.?|INR)\s*[\d,.]+\s*)?from\s+([^\n,]+?)(?=\s+(?:on|using|via|at)\b|[.\n]|$)/i;

/**
 * Pulls an amount and a short description out of a payment app's shared
 * "receipt" text. Deliberately conservative: a field is left blank/null
 * rather than guessed when the text doesn't clearly contain it, since the
 * caller always shows a draft the user confirms before it's saved.
 */
export function parseSharedReceipt(raw: string): ParsedReceipt {
  const text = raw.trim();

  const amountMatch = text.match(AMOUNT_PATTERN);
  const amount = amountMatch ? parseAmount(amountMatch[1].replace(/,/g, '')) : null;

  let particular = '';
  const paidTo = text.match(PAID_TO_PATTERN);
  const receivedFrom = text.match(RECEIVED_FROM_PATTERN);
  if (paidTo) {
    particular = `Paid to ${paidTo[1].trim()}`;
  } else if (receivedFrom) {
    particular = `Received from ${receivedFrom[1].trim()}`;
  }

  return { amount, particular, note: text };
}
