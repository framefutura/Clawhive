// DOCX format plugin
import fs from 'node:fs/promises'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import mammoth from 'mammoth'
import type { FormatPlugin } from '../format-registry.js'

export const docxPlugin: FormatPlugin = {
  id: 'docx',
  name: 'Word Document',
  extensions: ['.docx'],
  mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  canCreate: true,
  canEdit: false,
  canPreview: true,

  async create(filePath: string): Promise<void> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Untitled Document',
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Created with ClawHive',
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Start editing your document here...',
                size: 22,
              }),
            ],
          }),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    await fs.writeFile(filePath, buffer)
  },

  async read(filePath: string): Promise<{ type: 'text' | 'html' | 'binary'; data: unknown }> {
    const result = await mammoth.convertToHtml({ path: filePath })
    return { type: 'html', data: result.value }
  },
}
