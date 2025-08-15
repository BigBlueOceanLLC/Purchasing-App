/**
 * Utility functions for purchase order number generation and management
 */

/**
 * Generates a unique purchase order number in the format PO-YYYYMMDD-XXXX
 * @param existingPONumbers Array of existing PO numbers to ensure uniqueness
 * @returns A unique purchase order number
 */
export function generatePurchaseOrderNumber(existingPONumbers: string[] = []): string {
  const today = new Date();
  const datePrefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
  // Find the highest sequential number for today's date
  const todaysPONumbers = existingPONumbers.filter(po => po.startsWith(datePrefix));
  
  let maxSequence = 0;
  todaysPONumbers.forEach(po => {
    const sequencePart = po.split('-')[2];
    if (sequencePart) {
      const sequence = parseInt(sequencePart, 10);
      if (!isNaN(sequence) && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }
  });
  
  const nextSequence = maxSequence + 1;
  return `${datePrefix}-${String(nextSequence).padStart(4, '0')}`;
}

/**
 * Validates a purchase order number format
 * @param poNumber The PO number to validate
 * @returns True if the format is valid
 */
export function isValidPurchaseOrderNumber(poNumber: string): boolean {
  const poRegex = /^PO-\d{8}-\d{4}$/;
  return poRegex.test(poNumber);
}

/**
 * Extracts the date from a purchase order number
 * @param poNumber The PO number to extract date from
 * @returns Date object if valid, null otherwise
 */
export function getDateFromPurchaseOrderNumber(poNumber: string): Date | null {
  if (!isValidPurchaseOrderNumber(poNumber)) {
    return null;
  }
  
  const dateStr = poNumber.split('-')[1];
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Month is 0-indexed
  const day = parseInt(dateStr.substring(6, 8), 10);
  
  return new Date(year, month, day);
}