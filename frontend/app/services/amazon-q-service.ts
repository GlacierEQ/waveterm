import { AIService, AIMessage, AIServiceConfig } from './ai-service';
import { getApi } from '../api/api';
import { AmazonQConfig } from '../config/amazon-q-config';

export class AmazonQService implements AIService {
    private config: AIServiceConfig;
    private api = getApi();

    constructor(config: AIServiceConfig) {
        this.config = config;
    }

    async sendMessage(messages: AIMessage[]): Promise<AIMessage> {
        try {
            const response = await this.api.post('/ai/amazon-q/chat', {
                messages,
                model: this.config.model,
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
            });

            return {
                role: 'assistant',
                content: response.data.choices[0].message.content,
            };
        } catch (error) {
            console.error('Error calling Amazon Q API:', error);
            throw new Error('Failed to get response from Amazon Q');
        }
    }

    async streamMessage(messages: AIMessage[], onChunk: (chunk: string) => void): Promise<AIMessage> {
        try {
            const baseUrl = this.config.apiUrl?.replace(/\/+$/, '') || AmazonQConfig.API_ENDPOINT;
            if (!baseUrl) {
                throw new Error('Amazon Q API URL is not configured');
            }

            const response = await fetch(`${baseUrl}/ai/amazon-q/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                    messages,
                    model: this.config.model,
                    temperature: this.config.temperature,
                    max_tokens: this.config.maxTokens,
                    stream: true,
                }),
            });

            if (!response.ok) {
                const details = await response.text();
                throw new Error(`Amazon Q stream failed (${response.status}): ${details}`);
            }

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content || '';
                            if (content) {
                                fullResponse += content;
                                onChunk(content);
                            }
                        } catch (e) {
                            console.error('Error parsing chunk:', e);
                        }
                    }
                }
            }

            return {
                role: 'assistant',
                content: fullResponse,
            };
        } catch (error) {
            console.error('Error streaming from Amazon Q:', error);
            throw new Error('Failed to stream from Amazon Q');
        }
    }

    getConfig(): AIServiceConfig {
        return { ...this.config };
    }

    updateConfig(newConfig: Partial<AIServiceConfig>) {
        this.config = { ...this.config, ...newConfig };
    }
}
