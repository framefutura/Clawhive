// XLSX format plugin
import fs from 'node:fs/promises'
import * as XLSX from 'xlsx'
import type { FormatPlugin } from '../format-registry.js'

export const xlsxPlugin: FormatPlugin = {
  id: 'xlsx',
  name: 'Excel Spreadsheet',
  extensions: ['.xlsx', '.xls'],
  mimeTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  canCreate: true,
  canEdit: false,
  canPreview: true,

  async create(filePath: string): Promise<void> {
    const wb = XLSX.utils.book_new()

    // Create a sample worksheet with headers
    const data = [
      ['Column A', 'Column B', 'Column C'],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)

    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    await fs.writeFile(filePath, XLSX.write(wb, { type: 'buffer' }))
  },

  async read(filePath: string): Promise<{ type: 'text' | 'html' | 'binary'; data: unknown }> {
    const buffer = await fs.readFile(filePath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // Convert first sheet to CSV for preview
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const csv = XLSX.utils.sheet_to_csv(firstSheet)

    return { type: 'text', data: csv }
  },
}
