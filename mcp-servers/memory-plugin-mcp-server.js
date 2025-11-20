#!/usr/bin/env node

/**
 * Memory Plugin MCP Server
 * Extensible memory management with plugin architecture for Wave Terminal
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const isDev = process.env.NODE_ENV !== 'production';

class MemoryPluginMCPServer extends EventEmitter {
    constructor(port = 3007) {
        super();
        this.port = port;
        this.server = null;
        this.plugins = new Map();
        this.hooks = new Map();
        this.memories = new Map();
        this.pluginDir = path.join(__dirname, 'memory-plugins');
        this.memoryFile = path.join(__dirname, 'memory-plugin-store.json');
        this.loadData();
        this.loadPlugins();
    }

    loadData() {
        try {
            if (fs.existsSync(this.memoryFile)) {
                const data = fs.readFileSync(this.memoryFile, 'utf8');
                const parsed = JSON.parse(data);
                this.memories = new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.warn('⚠️ Could not load memory plugin data:', error.message);
        }
    }

    saveData() {
        try {
            const data = Object.fromEntries(this.memories);
            fs.writeFileSync(this.memoryFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('❌ Error saving memory plugin data:', error.message);
        }
    }

    loadPlugins() {
        if (!fs.existsSync(this.pluginDir)) {
            fs.mkdirSync(this.pluginDir, { recursive: true });
            console.log('📁 Created memory plugins directory');
            return;
        }

        const pluginFiles = fs.readdirSync(this.pluginDir).filter(file =>
            file.endsWith('.js') && file !== 'index.js'
        );

        pluginFiles.forEach(file => {
            try {
                const pluginPath = path.join(this.pluginDir, file);
                const plugin = require(pluginPath);

                if (plugin && typeof plugin.init === 'function') {
                    const pluginName = file.replace('.js', '');
                    this.plugins.set(pluginName, plugin);
                    plugin.init(this);
                    console.log(`🔌 Loaded memory plugin: ${pluginName}`);
                }
            } catch (error) {
                console.error(`❌ Failed to load plugin ${file}:`, error.message);
            }
        });
    }

    registerHook(hookName, handler) {
        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName).push(handler);
    }

    async executeHook(hookName, ...args) {
        const handlers = this.hooks.get(hookName) || [];
        const results = [];

        for (const handler of handlers) {
            try {
                const result = await handler(...args);
                results.push(result);
            } catch (error) {
                console.error(`Hook ${hookName} error:`, error.message);
            }
        }

        return results;
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
                    case '/plugins':
                        this.handlePlugins(req, res);
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
                    case '/process':
                        this.handleProcess(req, res);
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
            console.log(`🔌 Memory Plugin MCP Server running on port ${this.port}`);
            console.log(`📦 Active plugins: ${this.plugins.size}`);
            console.log(`🧠 Active memories: ${this.memories.size}`);
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down memory plugin server...');
            this.saveData();
            this.server.close(() => {
                console.log('✅ Memory plugin server stopped');
                process.exit(0);
            });
        });
    }

    handleHealth(req, res) {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            service: 'memory-plugin-mcp-server',
            uptime: process.uptime(),
            plugins: this.plugins.size,
            memories: this.memories.size,
            hooks: this.hooks.size,
            timestamp: new Date().toISOString()
        }));
    }

    handlePlugins(req, res) {
        if (req.method === 'GET') {
            const plugins = Array.from(this.plugins.entries()).map(([name, plugin]) => ({
                name,
                version: plugin.version || '1.0.0',
                description: plugin.description || 'No description',
                hooks: plugin.hooks || []
            }));
            res.writeHead(200);
            res.end(JSON.stringify(plugins));
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    async handleMemories(req, res) {
        if (req.method === 'GET') {
            const memories = Array.from(this.memories.entries()).map(([id, memory]) => ({
                id,
                ...memory
            }));
            res.writeHead(200);
            res.end(JSON.stringify(memories));
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const memory = JSON.parse(body);
                    const id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
                    memory.id = id;
                    memory.created = new Date().toISOString();
                    memory.updated = new Date().toISOString();

                    // Execute pre-save hooks
                    await this.executeHook('preSave', memory);

                    this.memories.set(id, memory);
                    this.saveData();

                    // Execute post-save hooks
                    await this.executeHook('postSave', memory);

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

    async handleMemory(req, res) {
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
                // Execute pre-read hooks
                await this.executeHook('preRead', memory);
                res.writeHead(200);
                res.end(JSON.stringify(memory));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Memory not found' }));
            }
        } else if (req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const updates = JSON.parse(body);
                    const memory = this.memories.get(id);

                    if (memory) {
                        const updatedMemory = { ...memory, ...updates, updated: new Date().toISOString() };

                        // Execute pre-update hooks
                        await this.executeHook('preUpdate', updatedMemory);

                        this.memories.set(id, updatedMemory);
                        this.saveData();

                        // Execute post-update hooks
                        await this.executeHook('postUpdate', updatedMemory);

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
                const memory = this.memories.get(id);

                // Execute pre-delete hooks
                await this.executeHook('preDelete', memory);

                this.memories.delete(id);
                this.saveData();

                // Execute post-delete hooks
                await this.executeHook('postDelete', memory);

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

    async handleSearch(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { query, limit = 10 } = JSON.parse(body);

                    // Execute search hooks
                    const pluginResults = await this.executeHook('search', query, limit);
                    const allResults = [];

                    // Add plugin results
                    pluginResults.forEach(results => {
                        if (Array.isArray(results)) {
                            allResults.push(...results);
                        }
                    });

                    // Add basic memory search
                    for (const [id, memory] of this.memories.entries()) {
                        const searchText = JSON.stringify(memory).toLowerCase();
                        if (searchText.includes(query.toLowerCase())) {
                            allResults.push({ id, ...memory });
                        }
                    }

                    // Apply limit and deduplicate
                    const uniqueResults = allResults
                        .filter((item, index, arr) => arr.findIndex(i => i.id === item.id) === index)
                        .slice(0, limit);

                    res.writeHead(200);
                    res.end(JSON.stringify({ results: uniqueResults, count: uniqueResults.length, query }));
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

    async handleProcess(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { action, data } = JSON.parse(body);

                    // Execute process hooks
                    const results = await this.executeHook('process', action, data);

                    res.writeHead(200);
                    res.end(JSON.stringify({
                        results,
                        action,
                        processed: true,
                        timestamp: new Date().toISOString()
                    }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON or process request' }));
                }
            });
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }
}

// Create example plugin file
const examplePluginPath = path.join(__dirname, 'memory-plugins', 'example-plugin.js');
if (!fs.existsSync(examplePluginPath)) {
    const examplePlugin = `// Example Memory Plugin
module.exports = {
    name: 'example-plugin',
    version: '1.0.0',
    description: 'Example plugin demonstrating memory plugin architecture',

    init(server) {
        // Register hooks
        server.registerHook('preSave', this.preSave.bind(this));
        server.registerHook('postSave', this.postSave.bind(this));
        server.registerHook('search', this.search.bind(this));
        server.registerHook('process', this.process.bind(this));
    },

    async preSave(memory) {
        // Add metadata before saving
        memory.processedBy = memory.processedBy || [];
        memory.processedBy.push('example-plugin');
        memory.lastProcessed = new Date().toISOString();
        return memory;
    },

    async postSave(memory) {
        // Log save operation
        console.log(\`Plugin: Memory \${memory.id} saved with plugin processing\`);
    },

    async search(query, limit) {
        // Custom search logic
        const results = [];
        // Implement custom search here
        return results;
    },

    async process(action, data) {
        // Handle custom processing actions
        switch (action) {
            case 'analyze':
                return { analysis: 'Sample analysis result', data };
            case 'summarize':
                return { summary: 'Sample summary', data };
            default:
                return { message: \`Unknown action: \${action}\` };
        }
    }
};
`;

    fs.writeFileSync(examplePluginPath, examplePlugin);
    console.log('📝 Created example memory plugin');
}

// Start server if run directly
if (require.main === module) {
    const port = process.env.PORT || 3007;
    const server = new MemoryPluginMCPServer(port);
    server.start();
}

module.exports = MemoryPluginMCPServer;