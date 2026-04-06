import type { CustomProviderConfig } from '../types'

/**
 * Fetches available models from a custom provider
 * Tries OpenAI-compatible /v1/models endpoint first, then Ollama /api/tags
 */
export async function fetchCustomModels(config: CustomProviderConfig): Promise<string[]> {
  if (!config.baseURL) {
    throw new Error('No base URL configured')
  }

  const endpoints = [
    { url: `${config.baseURL.replace(/\/$/, '')}/v1/models`, parser: parseOpenAIModels },
    { url: `${config.baseURL.replace(/\/$/, '')}/api/tags`, parser: parseOllamaModels },
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        headers: config.apiKey
          ? { 'Authorization': `Bearer ${config.apiKey}` }
          : {}
      })

      if (response.ok) {
        const data = await response.json()
        const models = endpoint.parser(data)
        if (models.length > 0) {
          return models
        }
      }
    } catch (error) {
      // Try next endpoint
      console.warn(`Failed to fetch from ${endpoint.url}:`, error)
    }
  }

  throw new Error('Could not fetch model list from provider')
}

function parseOpenAIModels(data: any): string[] {
  // OpenAI-compatible format: { data: [{ id: 'model-name', ... }] }
  if (data.data && Array.isArray(data.data)) {
    return data.data.map((m: any) => m.id).filter(Boolean)
  }
  // Alternative format: { models: [{ name: 'model-name', ... }] }
  if (data.models && Array.isArray(data.models)) {
    return data.models.map((m: any) => m.name || m.id).filter(Boolean)
  }
  return []
}

function parseOllamaModels(data: any): string[] {
  // Ollama format: { models: [{ name: 'llama3.2', ... }] }
  if (data.models && Array.isArray(data.models)) {
    return data.models.map((m: any) => m.name).filter(Boolean)
  }
  return []
}

/**
 * Test connection to a custom provider
 */
export async function testCustomProvider(config: CustomProviderConfig): Promise<boolean> {
  if (!config.baseURL) {
    return false
  }

  try {
    const response = await fetch(`${config.baseURL.replace(/\/$/, '')}/v1/models`, {
      headers: config.apiKey
        ? { 'Authorization': `Bearer ${config.apiKey}` }
        : {},
      signal: AbortSignal.timeout(5000)
    })
    return response.ok
  } catch {
    return false
  }
}