// PDF format plugin
import fs from 'node:fs/promises'
import PDFDocument from 'pdfkit'
import type { FormatPlugin } from '../format-registry.js'

export const pdfPlugin: FormatPlugin = {
  id: 'pdf',
  name: 'PDF Document',
  extensions: ['.pdf'],
  mimeTypes: ['application/pdf'],
  canCreate: true,
  canEdit: false,
  canPreview: true,

  async create(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument()
      const stream = fs.createWriteStream(filePath)

      doc.pipe(stream)

      // Add title
      doc.fontSize(24).text('Untitled Document', 100, 100)
      doc.moveDown()
      doc.fontSize(12).text('Created with ClawHive', { align: 'center' })

      doc.end()

      stream.on('finish', resolve)
      stream.on('error', reject)
    })
  },

  async read(filePath: string): Promise<{ type: 'text' | 'html' | 'binary'; data: unknown }> {
    const content = await fs.readFile(filePath)
    return { type: 'binary', data: content }
  },
}
