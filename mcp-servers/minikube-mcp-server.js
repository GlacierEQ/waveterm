#!/usr/bin/env node

/**
 * Minikube MCP Server
 * Provides local Kubernetes development environment management
 */

const http = require('http');
const { exec, spawn } = require('child_process');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

class MinikubeMCPServer {
    constructor(port = 3005) {
        this.port = port;
        this.server = null;
        this.maxExecutionTime = 300000; // 5 minutes for minikube operations
    }

    sanitizeInput(input) {
        if (!input || typeof input !== 'string') return false;

        // Block dangerous patterns
        const dangerousPatterns = [
            /\.\./,  // Path traversal
            /[<>"'&]/,  // Shell injection
            /\$\(.*\)/,  // Command substitution
            /`.*`/,  // Command execution
            /;\s*rm/,  // Dangerous commands
            /&&\s*rm/,  // Command chaining
            /--all-namespaces/,  // Potentially dangerous flag
        ];

        return !dangerousPatterns.some(pattern => pattern.test(input));
    }

    executeMinikube(args, options = {}) {
        return new Promise((resolve, reject) => {
            const command = `minikube ${args.join(' ')}`;
            console.log(`🚀 Executing: ${command}`);

            // Validate arguments for security
            for (const arg of args) {
                if (arg.includes('&&') || arg.includes(';') || arg.includes('|')) {
                    reject(new Error(`Dangerous command pattern detected: ${arg}`));
                    return;
                }
            }

            const minikube = spawn('minikube', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: this.maxExecutionTime,
                env: process.env
            });

            let stdout = '';
            let stderr = '';

            minikube.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            minikube.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            minikube.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, output: stdout, command });
                } else {
                    resolve({ success: false, output: stderr, command, exitCode: code });
                }
            });

            minikube.on('error', (error) => {
                reject(new Error(`minikube execution failed: ${error.message}`));
            });
        });
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
                    case '/status':
                        this.handleStatus(req, res);
                        break;
                    case '/version':
                        this.handleVersion(req, res);
                        break;
                    case '/start':
                        this.handleStart(req, res);
                        break;
                    case '/stop':
                        this.handleStop(req, res);
                        break;
                    case '/pause':
                        this.handlePause(req, res);
                        break;
                    case '/unpause':
                        this.handleUnpause(req, res);
                        break;
                    case '/delete':
                        this.handleDelete(req, res);
                        break;
                    case '/dashboard':
                        this.handleDashboard(req, res);
                        break;
                    case '/service':
                        this.handleService(req, res);
                        break;
                    case '/tunnel':
                        this.handleTunnel(req, res);
                        break;
                    case '/addons':
                        this.handleAddons(req, res);
                        break;
                    case '/config':
                        this.handleConfig(req, res);
                        break;
                    case '/logs':
                        this.handleLogs(req, res);
                        break;
                    case '/ssh':
                        this.handleSSH(req, res);
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
            console.log(`🚀 Minikube MCP Server running on port ${this.port}`);
            console.log(`🔒 Max execution time: ${this.maxExecutionTime}ms`);
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down minikube server...');
            this.server.close(() => {
                console.log('✅ Minikube server stopped');
                process.exit(0);
            });
        });
    }

    handleHealth(req, res) {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            service: 'minikube-mcp-server',
            uptime: process.uptime(),
            maxExecutionTime: this.maxExecutionTime,
            timestamp: new Date().toISOString()
        }));
    }

    async handleStatus(req, res) {
        try {
            const result = await this.executeMinikube(['status', '-o', 'json']);

            if (result.success) {
                let status = {};
                try {
                    status = JSON.parse(result.output);
                } catch {
                    status = { raw: result.output };
                }

                res.writeHead(200);
                res.end(JSON.stringify({
                    status,
                    timestamp: new Date().toISOString()
                }));
            } else {
                res.writeHead(400);
                res.end(JSON.stringify({ error: result.output }));
            }
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    async handleVersion(req, res) {
        try {
            const result = await this.executeMinikube(['version']);

            res.writeHead(result.success ? 200 : 400);
            res.end(JSON.stringify({
                version: result.output,
                success: result.success,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    async handleStart(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const options = JSON.parse(body) || {};

                    // Validate options
                    if (options.driver && !this.sanitizeInput(options.driver)) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid driver' }));
                        return;
                    }

                    const args = ['start'];

                    if (options.driver) args.push('--driver', options.driver);
                    if (options.cpus) args.push('--cpus', options.cpus.toString());
                    if (options.memory) args.push('--memory', options.memory);
                    if (options.diskSize) args.push('--disk-size', options.diskSize);
                    if (options.kubernetesVersion) args.push('--kubernetes-version', options.kubernetesVersion);
                    if (options.nodes) args.push('--nodes', options.nodes.toString());

                    const result = await this.executeMinikube(args);

                    res.writeHead(result.success ? 200 : 400);
                    res.end(JSON.stringify({
                        result: result.output,
                        options,
                        success: result.success,
                        timestamp: new Date().toISOString()
                    }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON or parameters' }));
                }
            });
        } else {
            // Simple start without options
            try {
                const result = await this.executeMinikube(['start']);

                res.writeHead(result.success ? 200 : 400);
                res.end(JSON.stringify({
                    result: result.output,
                    success: result.success,
                    timestamp: new Date().toISOString()
                }));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        }
    }

    async handleStop(req, res) {
        try {
            const result = await this.executeMinikube(['stop']);

            res.writeHead(result.success ? 200 : 400);
            res.end(JSON.stringify({
                result: result.output,
                success: result.success,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    async handlePause(req, res) {
        try {
            const result = await this.executeMinikube(['pause']);

            res.writeHead(result.success ? 200 : 400);
            res.end(JSON.stringify({
                result: result.output,
                success: result.success,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    async handleUnpause(req, res) {
        try {
            const result = await this.executeMinikube(['unpause']);

            res.writeHead(result.success ? 200 : 400);
            res.end(JSON.stringify({
                result: result.output,
                success: result.success,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    async handleDelete(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const options = JSON.parse(body) || {};
                    const args = ['delete'];

                    if (options.all) args.push('--all');
                    if (options.purge) args.push('--purge');

                    const result = await this.executeMinikube(args);

                    res.writeHead(result.success ? 200 : 400);
                    res.end(JSON.stringify({
                        result: result.output,
                        options,
                        success: result.success,
                        timestamp: new Date().toISOString()
                    }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON or parameters' }));
                }
            });
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    async handleDashboard(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const options = JSON.parse(body) || {};
                    const args = ['dashboard'];

                    if (options.url) args.push('--url');

                    const result = await this.executeMinikube(args);

                    res.writeHead(result.success ? 200 : 400);
                    res.end(JSON.stringify({
                        result: result.output,
                        options,
                        success: result.success,
                        timestamp: new Date().toISOString()
                    }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON or parameters' }));
                }
            });
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    async handleService(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const serviceName = url.searchParams.get('service');
        const namespace = url.searchParams.get('namespace') || 'default';

        if (!serviceName || !this.sanitizeInput(serviceName)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Valid service name required' }));
            return;
        }

        try {
            const result = await this.executeMinikube(['service', serviceName, '-n', namespace, '--url']);

            res.writeHead(result.success ? 200 : 400);
            res.end(JSON.stringify({
                url: result.output.trim(),
                serviceName,
                namespace,
                success: result.success,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    async handleTunnel(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const {
                        service,
                        namespace = 'default',
                        port = '80',
                        localPort
                    } = JSON.parse(body);

                    if (!this.sanitizeInput(service) || !this.sanitizeInput(port)) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid service or port' }));
                        return;
                    }

                    const args = ['tunnel'];

                    if (localPort) args.push('-p', localPort);

                    // Note: minikube tunnel runs interactively, so we'll use service command instead
                    const result = await this.executeMinikube([
                        'service', service, '-n', namespace, '--url', '--format=template',
                        '--template={{range .spec.ports}}{{.port}}{{end}}'
                    ]);

                    res.writeHead(result.success ? 200 : 400);
                    res.end(JSON.stringify({
                        result: result.output,
                        service,
                        namespace,
                        port,
                        localPort,
                        success: result.success,
                        timestamp: new Date().toISOString()
                    }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON or parameters' }));
                }
            });
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    async handleAddons(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const action = url.searchParams.get('action') || 'list';
        const addon = url.searchParams.get('addon');

        try {
            let args = ['addons'];

            if (action === 'list') {
                args.push('list');
            } else if (action === 'enable' && addon) {
                if (!this.sanitizeInput(addon)) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid addon name' }));
                    return;
                }
                args.push('enable', addon);
            } else if (action === 'disable' && addon) {
                if (!this.sanitizeInput(addon)) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid addon name' }));
                    return;
                }
                args.push('disable', addon);
            }

            const result = await this.executeMinikube(args);

            res.writeHead(result.success ? 200 : 400);
            res.end(JSON.stringify({
                result: result.output,
                action,
                addon,
                success: result.success,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    async handleConfig(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const action = url.searchParams.get('action') || 'get';
        const property = url.searchParams.get('property');

        try {
            const args = ['config'];

            if (action === 'get') {
                if (property) {
                    args.push('get', property);
                } else {
                    args.push('get');
                }
            } else if (action === 'set' && property && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    try {
                        const { value } = JSON.parse(body);

                        if (!this.sanitizeInput(value)) {
                            res.writeHead(400);
                            res.end(JSON.stringify({ error: 'Invalid config value' }));
                            return;
                        }

                        const result = await this.executeMinikube(['config', 'set', property, value]);

                        res.writeHead(result.success ? 200 : 400);
                        res.end(JSON.stringify({
                            result: result.output,
                            property,
                            value,
                            success: result.success,
                            timestamp: new Date().toISOString()
                        }));
                    } catch (error) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid JSON or parameters' }));
                    }
                });
                return;
            }

            const result = await this.executeMinikube(args);

            res.writeHead(result.success ? 200 : 400);
            res.end(JSON.stringify({
                result: result.output,
                action,
                property,
                success: result.success,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    async handleLogs(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const options = JSON.parse(body) || {};
                    const args = ['logs'];

                    if (options.follow) args.push('--follow');
                    if (options.lines) args.push('--lines', options.lines.toString());
                    if (options.since) args.push('--since', options.since);

                    const result = await this.executeMinikube(args);

                    res.writeHead(result.success ? 200 : 400);
                    res.end(JSON.stringify({
                        logs: result.output,
                        options,
                        success: result.success,
                        timestamp: new Date().toISOString()
                    }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON or parameters' }));
                }
            });
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    async handleSSH(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const command = url.searchParams.get('command');

        if (command && !this.sanitizeInput(command)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid SSH command' }));
            return;
        }

        try {
            const args = ['ssh'];
            if (command) args.push(command);

            const result = await this.executeMinikube(args);

            res.writeHead(result.success ? 200 : 400);
            res.end(JSON.stringify({
                result: result.output,
                command,
                success: result.success,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }
}

// Start server if run directly
if (require.main === module) {
    const port = process.env.PORT || 3005;
    const server = new MinikubeMCPServer(port);
    server.start();
}

module.exports = MinikubeMCPServer;
