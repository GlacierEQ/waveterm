export const AmazonQConfig = {
    // Default model to use for Amazon Q
    DEFAULT_MODEL: 'amazon.q-embedding-001',
    
    // API endpoint for Amazon Q
    API_ENDPOINT: '/api/amazon-q',
    
    // Default parameters
    DEFAULT_TEMPERATURE: 0.7,
    DEFAULT_MAX_TOKENS: 2048,
    
    // Available models
    MODELS: [
        {
            id: 'amazon.q-embedding-001',
            name: 'Amazon Q (Standard)',
            description: 'General purpose model for most use cases',
            maxTokens: 4096,
        },
        {
            id: 'amazon.q-embedding-002',
            name: 'Amazon Q (Large)',
            description: 'Larger model for more complex tasks',
            maxTokens: 8192,
        },
    ],
    
    // Default headers for API requests
    DEFAULT_HEADERS: {
        'Content-Type': 'application/json',
    },
    
    // Error messages
    ERROR_MESSAGES: {
        NO_API_KEY: 'Amazon Q API key is required',
        API_ERROR: 'Error communicating with Amazon Q API',
        STREAM_ERROR: 'Error streaming response from Amazon Q',
    },
};
