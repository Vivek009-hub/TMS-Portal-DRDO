import XLSX from 'xlsx';

/**
 * Reusable Excel export builder used by every "Export Excel" action across the app
 * (Participants, Courses, Course Roster, Certificates, Leaves, Feedback, Schedules, ...).
 * Produces a workbook with a proper header row, sensible column widths, and an
 * auto-filter over the data range. (Freeze-pane header is not supported by the
 * open-source `xlsx` writer used here, so it is intentionally omitted rather than
 * set silently and not honored.)
 *
 * @param {object} params
 * @param {string} params.sheetName
 * @param {{ key: string, label: string, width?: number }[]} params.columns
 * @param {object[]} params.rows
 * @returns {Buffer} .xlsx file buffer
 */
export function buildExcelBuffer({ sheetName, columns, rows }) {
  const headerRow = columns.map((c) => c.label);
  const dataRows = rows.map((row) => columns.map((c) => {
    const value = row[c.key];
    return value === null || value === undefined ? '' : value;
  }));

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

  worksheet['!cols'] = columns.map((c) => ({
    wch: Math.min(60, Math.max(12, c.width || c.label.length + 4)),
  }));

  if (dataRows.length > 0) {
    const range = { s: { r: 0, c: 0 }, e: { r: dataRows.length, c: columns.length - 1 } };
    worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, (sheetName || 'Export').slice(0, 31));
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/** Formats a Date/date-string/null as YYYY-MM-DD for exports, or '' when absent. */
export function formatExportDate(value) {
  if (!value) return '';
  const str = String(value);
  return str.length >= 10 ? str.slice(0, 10) : str;
}

/** Builds the "Training Year: 2025 | Department: Fire Safety" style summary line for PDF exports. */
export function buildFilterSummary(filters) {
  return Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => `${label}: ${value}`);
}
