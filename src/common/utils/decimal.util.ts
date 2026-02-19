import { Prisma } from '@prisma/client';

/**
 * Convert Prisma Decimal to number
 * Handles both Decimal objects and number types
 */
export function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return parseFloat(value) || 0;
  }

  // Prisma Decimal type (object with toNumber method)
  if (typeof value === 'object' && value !== null && typeof (value as Prisma.Decimal).toNumber === 'function') {
    return (value as Prisma.Decimal).toNumber();
  }

  // Fallback: try to convert
  return Number(value) || 0;
}
