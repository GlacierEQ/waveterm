#!/usr/bin/env node

/**
 * MCP Server Manager
 * Starts and manages all MCP servers for Wave Terminal
 */

const { spawn } = require('child_process');
const path = require('path');

class MCPServerManager {
    constructor() {
        this.servers = [
            {
                name: 'Memory',
                script: 'memory-mcp-server.js',
                port: 13000,
                process: null
            },
            {
                name: 'Filesystem',
                script: 'filesystem-mcp-server.js',
                port: 13001,
                process: null
            },
            {
                name: 'Terminal',
                script: 'terminal-mcp-server.js',
                port: 13002,
                process: null
            },
            {
                name: 'Kubectl',
                script: 'kubectl-mcp-server.js',
                port: 13003,
                process: null
            },
            {
                name: 'Helm',
                script: 'helm-mcp-server.js',
                port: 13004,
                process: null
            },
            {
                name: 'Minikube',
                script: 'minikube-mcp-server.js',
                port: 13005,
                process: null
            },
            {
                name: 'Docker',
                script: 'docker-mcp-server.js',
                port: 13006,
                process: null
            },
            {
                name: 'OpenMemory',
                script: 'openmemory-mcp-server.js',
                port: 13007,
                process: null
            },
            {
                name: 'SuperMemory',
                script: 'supermemory-mcp-server.js',
                port: 13008,
                process: null
            }
        ];
        this.isRunning = false;
    }

    startAll() {
        console.log('🚀 Starting MCP Servers...\n');

        this.servers.forEach(server => {
            this.startServer(server);
        });

        this.isRunning = true;

        // Setup graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down MCP servers...');
            this.stopAll();
        });

        console.log('\n✅ All MCP servers started successfully!');
        console.log('📡 Server endpoints:');
        this.servers.forEach(server => {
            console.log(`  ${server.name}: http://localhost:${server.port}`);
        });
        console.log('\n🧠 Memory System Architecture:');
        console.log('  • Basic Memory (13000): Persistent storage & search');
        console.log('  • OpenMemory (13007): Semantic search & knowledge graphs');
        console.log('  • SuperMemory (13008): Quantum intelligence & distributed memory');
    }

    startServer(server) {
        const scriptPath = path.join(__dirname, server.script);

        console.log(`🔄 Starting ${server.name} server on port ${server.port}...`);

        server.process = spawn('node', [scriptPath], {
            stdio: 'inherit',
            detached: false
        });

        server.process.on('error', (error) => {
            console.error(`❌ Failed to start ${server.name} server:`, error.message);
        });

        server.process.on('close', (code) => {
            if (code !== 0 && this.isRunning) {
                console.log(`⚠️ ${server.name} server stopped unexpectedly. Restarting...`);
                setTimeout(() => this.startServer(server), 2000);
            }
        });
    }

    stopAll() {
        this.isRunning = false;

        this.servers.forEach(server => {
            if (server.process) {
                console.log(`🛑 Stopping ${server.name} server...`);
                server.process.kill('SIGTERM');

                // Force kill after 5 seconds
                setTimeout(() => {
                    if (server.process && !server.process.killed) {
                        server.process.kill('SIGKILL');
                    }
                }, 5000);
            }
        });

        console.log('✅ All servers stopped');
        process.exit(0);
    }

    checkHealth() {
        console.log('\n🔍 Checking server health...\n');

        const http = require('http');

        this.servers.forEach(server => {
            const req = http.get(`http://localhost:${server.port}/health`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const health = JSON.parse(data);
                        const status = res.statusCode === 200 ? '🟢' : '🔴';
                        let details = `${health.status}`;
                        
                        if (health.uptime) details += ` (uptime: ${health.uptime}s)`;
                        if (health.memories) details += ` (memories: ${health.memories})`;
                        if (health.quantumCoherence) details += ` (coherence: ${(health.quantumCoherence * 100).toFixed(0)}%)`;
                        
                        console.log(`${status} ${server.name}: ${details}`);
                    } catch {
                        console.log(`🔴 ${server.name}: Error parsing health response`);
                    }
                });
            });

            req.on('error', () => {
                console.log(`🔴 ${server.name}: Not responding`);
            });

            req.setTimeout(5000, () => {
                console.log(`🔴 ${server.name}: Health check timeout`);
                req.destroy();
            });
        });
    }

    async testMemorySystem() {
        console.log('🧪 Testing Memory System Integration...\n');
        
        const testMemory = {
            content: 'Test memory for MCP integration',
            type: 'test',
            importance: 0.8,
            context: { test: true }
        };

        try {
            // Test basic memory
            console.log('Testing Basic Memory...');
            const basicResponse = await this.makeRequest('POST', 13000, '/memories', testMemory);
            console.log('✅ Basic Memory:', basicResponse ? 'OK' : 'Failed');

            // Test OpenMemory
            console.log('Testing OpenMemory...');
            const openResponse = await this.makeRequest('POST', 13007, '/memory', testMemory);
            console.log('✅ OpenMemory:', openResponse ? 'OK' : 'Failed');

            // Test SuperMemory
            console.log('Testing SuperMemory...');
            const superResponse = await this.makeRequest('POST', 13008, '/quantum-store', testMemory);
            console.log('✅ SuperMemory:', superResponse ? 'OK' : 'Failed');

            // Test search
            console.log('\nTesting Search Capabilities...');
            const searchQuery = { query: 'test memory', limit: 5 };
            
            const semanticSearch = await this.makeRequest('POST', 13007, '/semantic-search', searchQuery);
            console.log('✅ Semantic Search:', semanticSearch ? 'OK' : 'Failed');

            const quantumRecall = await this.makeRequest('POST', 13008, '/quantum-recall', { query: 'test memory', coherence: 0.3 });
            console.log('✅ Quantum Recall:', quantumRecall ? 'OK' : 'Failed');

            console.log('\n🎉 Memory system test completed!');
        } catch (error) {
            console.error('❌ Memory system test failed:', error.message);
        }
    }

    makeRequest(method, port, path, data) {
        return new Promise((resolve) => {
            const http = require('http');
            const postData = data ? JSON.stringify(data) : null;
            
            const options = {
                hostname: 'localhost',
                port,
                path,
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': postData ? Buffer.byteLength(postData) : 0
                }
            };

            const req = http.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        resolve(parsed);
                    } catch {
                        resolve(res.statusCode === 200);
                    }
                });
            });

            req.on('error', () => resolve(null));
            req.setTimeout(5000, () => {
                req.destroy();
                resolve(null);
            });

            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }
}

// CLI interface
function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'start';

    const manager = new MCPServerManager();

    switch (command) {
        case 'start':
            manager.startAll();
            break;
        case 'stop':
            manager.stopAll();
            break;
        case 'health':
            manager.checkHealth();
            break;
        case 'restart':
            manager.stopAll();
            setTimeout(() => manager.startAll(), 1000);
            break;
        case 'memory-test':
            manager.testMemorySystem().catch(err => {
                console.error('❌ Memory test runner failed:', err.message);
                process.exit(1);
            });
            break;
        default:
            console.log('Usage: node mcp-server-manager.js [start|stop|health|restart|memory-test]');
            process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = MCPServerManager;
