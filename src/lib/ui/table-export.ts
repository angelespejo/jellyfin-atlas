export interface ExportTable {
  headers: string[]
  rows: string[][]
}

function download(filename: string, content: BlobPart, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function csvCell(value: string): string {
  const escaped = value.replace(/"/g, '""')
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped
}

export function downloadCsv(table: ExportTable, filename = 'jellyfin-titles.csv') {
  const lines = [
    table.headers.map(csvCell).join(','),
    ...table.rows.map((row) => row.map(csvCell).join(',')),
  ]
  download(filename, `\uFEFF${lines.join('\n')}`, 'text/csv;charset=utf-8')
}

export function downloadJson(table: ExportTable, filename = 'jellyfin-titles.json') {
  const data = table.rows.map((row) =>
    Object.fromEntries(table.headers.map((header, index) => [header, row[index] ?? '']))
  )
  download(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8')
}

export async function downloadPdf(table: ExportTable, filename = 'jellyfin-titles.pdf') {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  document.setFontSize(15)
  document.text('JellyFin Atlas', 40, 36)
  document.setFontSize(9)
  document.setTextColor(100)
  document.text(`${table.rows.length} titles`, 40, 50)
  document.setTextColor(0)

  autoTable(document, {
    startY: 62,
    head: [table.headers],
    body: table.rows,
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [113, 61, 134], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 246, 248] },
    margin: { left: 40, right: 40 },
  })

  document.save(filename)
}
