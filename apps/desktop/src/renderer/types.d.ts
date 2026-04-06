export type GeneCategory = 'dev' | 'data' | 'ops' | 'network' | 'creative' | 'comm' | 'security' | 'efficiency';
export interface Gene {
    id: string;
    name: string;
    category: GeneCategory;
    description: string;
    version: string;
}
export interface CustomProviderConfig {
  baseURL: string;
  apiKey?: string;
}
export interface ModelConfig {
    provider: 'anthropic' | 'openai' | 'ollama' | 'custom';
    model: string;
    apiKey?: string;
    baseUrl?: string;
    customProviderConfig?: CustomProviderConfig;
}
export interface Session {
    id: string;
    agentId: string;
    modelConfig: ModelConfig;
    genes: string[];
    createdAt: number;
    messages: ChatMessage[];
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    attachments?: {
        name: string;
        type: string;
        path: string;
    }[];
}
