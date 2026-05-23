const ONES = [
  '',
  'ONE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
  'TEN',
  'ELEVEN',
  'TWELVE',
  'THIRTEEN',
  'FOURTEEN',
  'FIFTEEN',
  'SIXTEEN',
  'SEVENTEEN',
  'EIGHTEEN',
  'NINETEEN',
];

const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n]!;
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t]! : `${TENS[t]} ${ONES[o]}`.trim();
}

function threeDigits(n: number): string {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(`${ONES[h]} HUNDRED`);
  if (rest > 0) parts.push(twoDigits(rest));
  return parts.join(' ').trim();
}

function integerToWords(n: number): string {
  if (n === 0) return 'ZERO';

  const parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundredRem = n;

  if (crore > 0) parts.push(`${threeDigits(crore)} CRORE`);
  if (lakh > 0) parts.push(`${threeDigits(lakh)} LAKH`);
  if (thousand > 0) parts.push(`${threeDigits(thousand)} THOUSAND`);
  if (hundredRem > 0) parts.push(threeDigits(hundredRem));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Convert amount to Indian English words, e.g. "SEVEN THOUSAND THREE HUNDRED FIFTY RUPEES ONLY". */
export function amountInWords(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let words = `${integerToWords(rupees)} RUPEES`;
  if (paise > 0) {
    words += ` AND ${integerToWords(paise)} PAISE`;
  }
  return `${words} ONLY`;
}
