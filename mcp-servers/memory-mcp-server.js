#!/usr/bin/env node

/**
 * Memory MCP Server
 * Provides persistent memory and context management for the Wave Terminal AI system
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

class MemoryMCPServer {
    constructor(port = 3000) {
        this.port = port;
        this.memories = new Map();
        this.memoryFile = path.join(__dirname, 'memory-store.json');
        this.loadMemories();
        this.server = null;
    }

    loadMemories() {
        try {
            if (fs.existsSync(this.memoryFile)) {
                const data = fs.readFileSync(this.memoryFile, 'utf8');
                const parsed = JSON.parse(data);
                this.memories = new Map(Object.entries(parsed));
                console.log(`📚 Loaded ${this.memories.size} memories from storage`);
            }
        } catch (error) {
            console.warn('⚠️ Could not load memories:', error.message);
        }
    }

    saveMemories() {
        try {
            const data = Object.fromEntries(this.memories);
            fs.writeFileSync(this.memoryFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('❌ Error saving memories:', error.message);
        }
    }

    start() {
        this.server = http.createServer((req, res) => {
            // Security: Restrict CORS to localhost only
            const origin = req.headers.origin;
            const allowedOrigins = [
                'http://localhost:5173',  // Vite dev server
                'http://localhost:3000',  // Electron renderer
                'http://127.0.0.1:5173',
                'http://127.0.0.1:3000'
            ];

            if (origin && allowedOrigins.includes(origin)) {
                res.setHeader('Access-Control-Allow-Origin', origin);
            } else if (isDev) {
                // Only allow localhost origins in development
                const isLocalhost = origin && (
                    origin.startsWith('http://localhost:') ||
                    origin.startsWith('http://127.0.0.1:')
                );
                if (isLocalhost) {
                    res.setHeader('Access-Control-Allow-Origin', origin);
                }
            }

            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            const url = new URL(req.url, `http://localhost:${this.port}`);
            const endpoint = url.pathname;

            try {
                switch (endpoint) {
                    case '/health':
                        this.handleHealth(req, res);
                        break;
                    case '/memories':
                        this.handleMemories(req, res);
                        break;
                    case '/memory':
                        this.handleMemory(req, res);
                        break;
                    case '/search':
                        this.handleSearch(req, res);
                        break;
                    default:
                        res.writeHead(404);
                        res.end(JSON.stringify({ error: 'Not found' }));
                }
            } catch (error) {
                console.error('Server error:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        });

        this.server.listen(this.port, () => {
            console.log(`🧠 Memory MCP Server running on port ${this.port}`);
            console.log(`📊 Active memories: ${this.memories.size}`);
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down memory server...');
            this.saveMemories();
            this.server.close(() => {
                console.log('✅ Memory server stopped');
                process.exit(0);
            });
        });
    }

    handleHealth(req, res) {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            uptime: process.uptime(),
            memories: this.memories.size,
            timestamp: new Date().toISOString()
        }));
    }

    handleMemories(req, res) {
        if (req.method === 'GET') {
            const memories = Array.from(this.memories.entries()).map(([key, value]) => ({
                id: key,
                ...value
            }));
            res.writeHead(200);
            res.end(JSON.stringify(memories));
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const memory = JSON.parse(body);
                    const id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
                    memory.id = id;
                    memory.created = new Date().toISOString();
                    memory.updated = new Date().toISOString();

                    this.memories.set(id, memory);
                    this.saveMemories();

                    res.writeHead(201);
                    res.end(JSON.stringify({ id, message: 'Memory created' }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    handleMemory(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const id = url.searchParams.get('id');

        if (!id) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Memory ID required' }));
            return;
        }

        if (req.method === 'GET') {
            const memory = this.memories.get(id);
            if (memory) {
                res.writeHead(200);
                res.end(JSON.stringify(memory));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Memory not found' }));
            }
        } else if (req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const updates = JSON.parse(body);
                    const memory = this.memories.get(id);

                    if (memory) {
                        const updatedMemory = { ...memory, ...updates, updated: new Date().toISOString() };
                        this.memories.set(id, updatedMemory);
                        this.saveMemories();

                        res.writeHead(200);
                        res.end(JSON.stringify({ message: 'Memory updated' }));
                    } else {
                        res.writeHead(404);
                        res.end(JSON.stringify({ error: 'Memory not found' }));
                    }
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
        } else if (req.method === 'DELETE') {
            if (this.memories.has(id)) {
                this.memories.delete(id);
                this.saveMemories();

                res.writeHead(200);
                res.end(JSON.stringify({ message: 'Memory deleted' }));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Memory not found' }));
            }
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    handleSearch(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { query, limit = 10 } = JSON.parse(body);

                    const results = [];
                    for (const [id, memory] of this.memories.entries()) {
                        if (results.length >= limit) break;

                        const searchText = JSON.stringify(memory).toLowerCase();
                        if (searchText.includes(query.toLowerCase())) {
                            results.push({ id, ...memory });
                        }
                    }

                    res.writeHead(200);
                    res.end(JSON.stringify({ results, count: results.length }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON or query' }));
                }
            });
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }
}

// Start server if run directly
if (require.main === module) {
    const port = process.env.PORT || 3000;
    const server = new MemoryMCPServer(port);
    server.start();
}

module.exports = MemoryMCPServer;
