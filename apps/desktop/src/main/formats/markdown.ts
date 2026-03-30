// Markdown format plugin
import fs from 'node:fs/promises'
import type { FormatPlugin } from '../format-registry.js'

export const markdownPlugin: FormatPlugin = {
  id: 'markdown',
  name: 'Markdown',
  extensions: ['.md', '.markdown'],
  mimeTypes: ['text/markdown', 'text/x-markdown'],
  canCreate: true,
  canEdit: true,
  canPreview: true,

  async create(filePath: string): Promise<void> {
    const content = '# Untitled\n\nStart writing here...\n'
    await fs.writeFile(filePath, content, 'utf-8')
  },

  async read(filePath: string): Promise<{ type: 'text' | 'html' | 'binary'; data: unknown }> {
    const content = await fs.readFile(filePath, 'utf-8')
    return { type: 'text', data: content }
  },
}
