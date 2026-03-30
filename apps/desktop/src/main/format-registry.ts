// Format plugin registry for extensible file format support
import fs from 'node:fs/promises'
import path from 'node:path'

export interface FormatPlugin {
  id: string
  name: string
  extensions: string[]
  mimeTypes?: string[]
  canCreate: boolean
  canEdit: boolean
  canPreview: boolean
  create?(filePath: string): Promise<void>
  read?(filePath: string): Promise<{ type: 'text' | 'html' | 'binary'; data: unknown }>
}

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

class FormatRegistry {
  private plugins = new Map<string, FormatPlugin>()

  /**
   * Register a format plugin
   */
  register(plugin: FormatPlugin): void {
    this.plugins.set(plugin.id, plugin)
  }

  /**
   * Get a plugin by its ID
   */
  getPlugin(id: string): FormatPlugin | undefined {
    return this.plugins.get(id)
  }

  /**
   * Resolve a plugin by file path (matches extension)
   */
  resolveByPath(filePath: string): FormatPlugin | undefined {
    const ext = path.extname(filePath).toLowerCase()
    for (const plugin of this.plugins.values()) {
      if (plugin.extensions.includes(ext)) {
        return plugin
      }
    }
    return undefined
  }

  /**
   * List all plugins that can create files
   */
  listCreatable(): FormatPlugin[] {
    return Array.from(this.plugins.values()).filter(p => p.canCreate)
  }

  /**
   * List all registered plugins
   */
  listAll(): FormatPlugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Build a recursive file tree from a directory
   */
  async buildFileTree(dirPath: string): Promise<TreeNode[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const nodes: TreeNode[] = []

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      const node: TreeNode = {
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? 'directory' : 'file',
      }

      if (entry.isDirectory()) {
        try {
          node.children = await this.buildFileTree(fullPath)
        } catch {
          // Skip directories we can't read
          node.children = []
        }
      }

      nodes.push(node)
    }

    // Sort: directories first, then alphabetically
    return nodes.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name)
      }
      return a.type === 'directory' ? -1 : 1
    })
  }
}

// Singleton instance
export const formatRegistry = new FormatRegistry()
