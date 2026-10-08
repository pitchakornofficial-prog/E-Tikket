/**
 * CSV Utility for E-Tikket
 * Implements RFC 4180 escaping and UTF-8 BOM encoding for seamless Microsoft Excel
 * and Google Sheets Thai language display without font corruption.
 */

export const UTF8_BOM = "\uFEFF";

/**
 * Escapes an individual cell value according to RFC 4180.
 * Wraps values containing quotes, commas, newlines in double quotes,
 * and doubles internal quotation marks.
 */
export function escapeCSVCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  const str = String(value);

  // Check if cell needs quoting (contains comma, quote, newline, or carriage return)
  if (
    str.includes('"') ||
    str.includes(",") ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  // Quote if it starts or ends with whitespace to preserve formatting
  if (str.startsWith(" ") || str.endsWith(" ")) {
    return `"${str}"`;
  }

  return `"${str}"`;
}

/**
 * Converts a list of headers and 2D row array into an RFC 4180 compliant CSV string
 * prefixed with UTF-8 BOM.
 */
export function generateCSV(
  headers: string[],
  rows: (unknown)[][]
): string {
  const headerLine = headers.map(escapeCSVCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSVCell).join(","));

  return UTF8_BOM + [headerLine, ...dataLines].join("\r\n");
}

/**
 * Creates a standard CSV download Response with appropriate HTTP headers.
 */
export function createCSVDownloadResponse(
  csvContent: string,
  filename: string
): Response {
  // Safe ASCII filename fallback and RFC 5987 UTF-8 encoded filename
  const safeAsciiFilename = filename.replace(/[^\w.-]/g, "_");
  const encodedFilename = encodeURIComponent(filename);

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
