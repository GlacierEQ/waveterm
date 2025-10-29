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
                        console.log(`${status} ${server.name}: ${health.status} (uptime: ${health.uptime}s)`);
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
        default:
            console.log('Usage: node mcp-server-manager.js [start|stop|health|restart]');
            process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = MCPServerManager;
