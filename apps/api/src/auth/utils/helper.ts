/**
 * Generates a random alphanumeric invoice number.
 * Example output: "INV-A1B2C3D4" or "INV-X9Y8Z7W6"
 *
 * @param length - Optional length of the alphanumeric part (default: 8)
 * @param prefix - Optional prefix for the invoice number (default: "INV")
 * @returns A random uppercase alphanumeric string with prefix
 */
export function generateRandomInvoiceNumber({
  length = 8,
  prefix = 'INV',
}: {
  length?: number;
  prefix?: string;
} = {}): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${result}`;
}

export function generateJournalReference(prefix: string = 'JRNL'): string {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `${prefix}${datePart}${randomPart}`;
  // Example: JRNL250410K7N4P9
}

/**
 * Generates a sequential bill reference (e.g., BILL-0001, BILL-0002)
 * This function should be called from the bill service with database access
 * @param nextSequence - The next sequence number to use
 * @param prefix - Optional prefix for the bill reference (default: "BILL")
 * @returns A formatted bill reference like "BILL-0001"
 */
export function generateBillReference(nextSequence: number, prefix: string = 'BILL'): string {
  const paddedSequence = String(nextSequence).padStart(4, '0');
  return `${prefix}-${paddedSequence}`;
  // Example: BILL-0001, BILL-0002, BILL-0003
}

/**
 * Generates a subdomain-worthy string from a group name
 * Converts to lowercase, removes special characters, replaces spaces with hyphens
 * Example: "My Awesome Company" -> "my-awesome-company"
 * 
 * @param groupName - The group/company name
 * @returns A subdomain-safe string (lowercase, alphanumeric + hyphens only)
 */
export function generateSubdomain(groupName: string): string {
  return (
    groupName
      .toLowerCase() // Convert to lowercase
      .trim() // Remove leading/trailing whitespace
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace consecutive hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
  );
}
