import express from 'express';
import { AWS } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Initialize AWS Bedrock client for Amazon Q
const bedrock = new AWS.BedrockRuntime({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: new AWS.EnvironmentCredentials('AWS'),
});

// Endpoint for chat completions
router.post('/chat', async (req, res) => {
    try {
        const { messages, model, temperature, max_tokens } = req.body;

        // Format messages for Amazon Q
        const prompt = messages
            .map((msg: any) => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
            .join('\n') + '\n\nAssistant:';

        const params = {
            modelId: model || 'amazon.q-embedding-001',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                prompt,
                max_tokens_to_sample: max_tokens || 2048,
                temperature: temperature || 0.7,
                top_p: 0.9,
                stop_sequences: ['\n\nHuman:'],
            }),
        };

        const response = await bedrock.invokeModel(params).promise();
        const responseBody = JSON.parse(response.body.toString());

        res.json({
            id: `chatcmpl-${uuidv4()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
                message: {
                    role: 'assistant',
                    content: responseBody.completion.trim(),
                },
                finish_reason: 'stop',
                index: 0,
            }],
            usage: {
                prompt_tokens: 0, // Amazon Q doesn't return token counts
                completion_tokens: 0,
                total_tokens: 0,
            },
        });
    } catch (error) {
        console.error('Amazon Q API error:', error);
        res.status(500).json({
            error: {
                message: 'Error calling Amazon Q API',
                type: 'api_error',
                param: null,
                code: null,
            },
        });
    }
});

// Endpoint for streaming responses
router.post('/stream', async (req, res) => {
    try {
        const { messages, model, temperature, max_tokens } = req.body;

        // Format messages for Amazon Q
        const prompt = messages
            .map((msg: any) => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
            .join('\n') + '\n\nAssistant:';

        const params = {
            modelId: model || 'amazon.q-embedding-001',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                prompt,
                max_tokens_to_sample: max_tokens || 2048,
                temperature: temperature || 0.7,
                top_p: 0.9,
                stop_sequences: ['\n\nHuman:'],
                stream: true,
            }),
        };

        // Set headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Create a stream from Bedrock
        const response = await bedrock.invokeModelWithResponseStream(params).promise();

        // @ts-ignore - AWS SDK types don't include the event stream
        const stream = response.body as AWS.BedrockRuntime.StreamingBlobPayloadOutput;
        let ended = false;

        const buildChunk = (content: string | null, options: { error?: string } = {}) => ({
            id: `chatcmpl-${uuidv4()}`,
            object: content ? 'chat.completion.chunk' : 'chat.completion.error',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
                delta: content ? { content } : undefined,
                index: 0,
                finish_reason: options.error ? 'error' : null,
            }],
            error: options.error ? { message: options.error, type: 'stream_error' } : undefined,
        });

        const finishStream = (errorMessage?: string) => {
            if (ended) return;
            ended = true;
            if (errorMessage) {
                res.write(`data: ${JSON.stringify(buildChunk('', { error: errorMessage }))}\n\n`);
            }
            res.write('data: [DONE]\n\n');
            res.end();
        };

        stream.on('data', (event) => {
            if (event.chunk) {
                try {
                    const chunk = JSON.parse(Buffer.from(event.chunk.bytes).toString());
                    const content = chunk.completion?.trim();
                    if (content) {
                        res.write(`data: ${JSON.stringify(buildChunk(content))}\n\n`);
                    }
                } catch (chunkError) {
                    console.error('Error parsing chunk:', chunkError);
                }
            }
        });

        stream.on('end', () => finishStream());

        stream.on('error', (error) => {
            console.error('Stream error:', error);
            finishStream(error.message);
        });

        req.on('close', () => finishStream('Client disconnected'));
    } catch (error) {
        console.error('Amazon Q stream error:', error);
        res.status(500).json({
            error: {
                message: 'Error streaming from Amazon Q',
                type: 'api_error',
                details: error instanceof Error ? error.message : 'unknown',
            },
        });
    }
});

export default router;
