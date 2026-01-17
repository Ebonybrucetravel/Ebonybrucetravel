/**
 * Generate unique booking reference
 * Format: EBT-YYYYMMDD-XXXXXX (6 random digits)
 */
export function generateBookingReference(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Generate 6 random digits
  const random = Math.floor(100000 + Math.random() * 900000);

  return `EBT-${dateStr}-${random}`;
}

