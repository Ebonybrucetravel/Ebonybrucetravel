import { Decimal } from '@prisma/client/runtime/library';

/**
 * Convert Prisma Decimal to number
 * Handles both Decimal objects and number types
 */
export function toNumber(value: Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    return parseFloat(value) || 0;
  }
  
  // Prisma Decimal type
  if (value instanceof Decimal) {
    return value.toNumber();
  }
  
  // Fallback: try to convert
  return Number(value) || 0;
}

