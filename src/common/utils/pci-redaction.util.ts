/**
 * PCI DSS: Never log or expose full PAN (Primary Account Number), card number, or CVV/security code.
 * Use these helpers before logging any request/response or error that might contain card data.
 */

const CARD_FIELD_NAMES = new Set([
  'cardNumber',
  'card_number',
  'number',
  'securityCode',
  'security_code',
  'cvc',
  'cvv',
  'pan',
  'paymentCardInfo',
  'payment_card_info',
  'paymentCard',
  'payment_card',
]);

const REDACTED = '[REDACTED]';

/**
 * Redact known card-related keys in an object (recursive). Use before logging request/response.
 */
export function redactCardData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => redactCardData(item)) as T;
  }
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      if (CARD_FIELD_NAMES.has(key) || CARD_FIELD_NAMES.has(keyLower)) {
        out[key] = REDACTED;
      } else {
        out[key] = redactCardData(value);
      }
    }
    return out as T;
  }
  return obj;
}

/**
 * Redact card-number-like patterns and CVV from a string (e.g. API error response body).
 * Use before logging any string that might contain card data.
 */
export function redactCardFromString(s: string, maxLength = 500): string {
  if (!s || typeof s !== 'string') return s;
  let out = s.slice(0, maxLength);
  // Replace 13-19 digit sequences (card numbers) with ****
  out = out.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}(\d{0,5})?\b/g, '****-****-****-****');
  // Replace 3-4 digit CVV-like standalone numbers (be conservative: only after "cvc" or "cvv" or "security")
  out = out.replace(/(cvc|cvv|securityCode|security_code)["\s:=]+(\d{3,4})\b/gi, '$1": "***"');
  return out;
}
