export interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AIServiceConfig {
    apiKey: string;
    apiUrl?: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}

export interface AIService {
    sendMessage(messages: AIMessage[]): Promise<AIMessage>;
    streamMessage(messages: AIMessage[], onChunk: (chunk: string) => void): Promise<AIMessage>;
    getConfig(): AIServiceConfig;
    updateConfig(config: Partial<AIServiceConfig>): void;
}
