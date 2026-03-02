import ExcelJS from 'exceljs'

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const normalizeCellValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (value instanceof Date) return value.toISOString()

  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text
    if (typeof value.hyperlink === 'string') return String(value.text || value.hyperlink)
    if (typeof value.result === 'string' || typeof value.result === 'number' || typeof value.result === 'boolean') {
      return String(value.result)
    }
    if (typeof value.formula === 'string') {
      return String(value.result ?? value.formula)
    }
    if (Array.isArray(value.richText)) {
      return value.richText.map((entry) => String(entry?.text || '')).join('')
    }
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const triggerBlobDownload = (blob, fileName) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const downloadUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = String(fileName || 'export.xlsx')
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(downloadUrl)
}

export const parseFirstWorksheet = async (
  arrayBuffer,
  {
    maxCollectedRows = 1500,
    maxCollectedColumns = 40,
  } = {},
) => {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return {
      sheetName: '',
      rows: [],
      totalRows: 0,
      totalColumns: 0,
      sourceTruncated: false,
    }
  }

  const collectedRows = []
  let maxColumnsSeen = 0
  let sourceTruncated = false

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > maxCollectedRows) {
      sourceTruncated = true
      return
    }
    const fullColumnCount = Math.max(Number(row.cellCount || 0), Number(row.actualCellCount || 0), 1)
    const columnCount = Math.min(Math.max(1, fullColumnCount), Math.max(1, Number(maxCollectedColumns) || 1))
    if (fullColumnCount > columnCount) sourceTruncated = true
    maxColumnsSeen = Math.max(maxColumnsSeen, fullColumnCount)
    const values = []
    for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
      values.push(normalizeCellValue(row.getCell(columnIndex).value))
    }
    collectedRows.push(values)
  })

  return {
    sheetName: worksheet.name || 'Sheet1',
    rows: collectedRows,
    totalRows: worksheet.actualRowCount || collectedRows.length,
    totalColumns: Math.max(maxColumnsSeen, ...collectedRows.map((row) => row.length), 0),
    sourceTruncated,
  }
}

export const downloadObjectRowsAsXlsx = async ({
  fileName = 'export.xlsx',
  sheetName = 'Sheet1',
  rows = [],
} = {}) => {
  const normalizedRows = Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : []
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(String(sheetName || 'Sheet1').slice(0, 31))

  if (normalizedRows.length > 0) {
    const keys = [...new Set(normalizedRows.flatMap((row) => Object.keys(row)))]
    worksheet.columns = keys.map((key) => ({
      header: key,
      key,
      width: Math.min(60, Math.max(12, String(key).length + 4)),
    }))
    normalizedRows.forEach((row) => {
      worksheet.addRow(row)
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  triggerBlobDownload(new Blob([buffer], { type: EXCEL_MIME_TYPE }), fileName)
}
