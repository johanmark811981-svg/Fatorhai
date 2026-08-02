/**
 * Export data array to a clean CSV file with UTF-8 BOM for perfect Excel & Arabic support.
 */
export function exportToExcel(filename: string, headers: string[], rows: (string | number)[][]) {
  let cleanFilename = filename;
  if (cleanFilename.endsWith('.xlsx')) {
    cleanFilename = cleanFilename.replace(/\.xlsx$/i, '.csv');
  } else if (cleanFilename.endsWith('.xls')) {
    cleanFilename = cleanFilename.replace(/\.xls$/i, '.csv');
  } else if (!cleanFilename.endsWith('.csv')) {
    cleanFilename = `${cleanFilename}.csv`;
  }

  const csvLines = [
    headers.map((h) => `"${String(h ?? '').replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row.map((field) => `"${String(field ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ];

  const csvContent = csvLines.join('\r\n');
  // UTF-8 BOM (\uFEFF) ensures Excel opens Arabic characters natively without encoding issues
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
