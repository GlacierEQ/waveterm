#!/usr/bin/env node

/**
 * Kubernetes kubectl MCP Server
 * Provides comprehensive Kubernetes cluster management and operations for Wave Terminal
 */

const http = require('http');
const { exec, spawn } = require('child_process');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

class KubectlMCPServer {
    constructor(port = 3003) {
        this.port = port;
        this.server = null;
        this.maxExecutionTime = 60000; // 60 seconds for K8s operations
        this.allowedNamespaces = process.env.ALLOWED_NAMESPACES
            ? process.env.ALLOWED_NAMESPACES.split(',').map(ns => ns.trim())
            : null;
    }

    validateNamespace(namespace) {
        if (!this.allowedNamespaces) return true;
        return this.allowedNamespaces.includes(namespace) || namespace === 'default';
    }

    sanitizeResourceName(name) {
        // Kubernetes resource name validation
        if (!name || typeof name !== 'string') return false;

        const validNamePattern = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
        if (name.length > 253 || !validNamePattern.test(name)) {
            return false;
        }

        // Block dangerous patterns
        const dangerousPatterns = [
            /\.\./,  // Path traversal
            /[<>"'&]/,  // Shell injection
            /\$\(.*\)/,  // Command substitution
            /`.*`/,  // Command execution
        ];

        return !dangerousPatterns.some(pattern => pattern.test(name));
    }

    executeKubectl(args, options = {}) {
        return new Promise((resolve, reject) => {
            const command = `kubectl ${args.join(' ')}`;
            console.log(`🔧 Executing: ${command}`);

            // Validate arguments for security
            for (const arg of args) {
                if (arg.includes('&&') || arg.includes(';') || arg.includes('|')) {
                    reject(new Error(`Dangerous command pattern detected: ${arg}`));
                    return;
                }
            }

            const kubectl = spawn('kubectl', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: this.maxExecutionTime,
                env: { ...process.env, KUBECONFIG: options.kubeconfig }
            });

            let stdout = '';
            let stderr = '';

            kubectl.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            kubectl.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            kubectl.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, output: stdout, command });
                } else {
                    resolve({ success: false, output: stderr, command, exitCode: code });
                }
            });

            kubectl.on('error', (error) => {
                reject(new Error(`kubectl execution failed: ${error.message}`));
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
                    case '/cluster':
                        this.handleClusterInfo(req, res);
                        break;
                    case '/namespaces':
                        this.handleNamespaces(req, res);
                        break;
                    case '/pods':
                        this.handlePods(req, res);
                        break;
                    case '/deployments':
                        this.handleDeployments(req, res);
                        break;
                    case '/services':
                        this.handleServices(req, res);
                        break;
                    case '/logs':
                        this.handleLogs(req, res);
                        break;
                    case '/exec':
                        this.handleExec(req, res);
                        break;
                    case '/apply':
                        this.handleApply(req, res);
                        break;
                    case '/delete':
                        this.handleDelete(req, res);
                        break;
                    case '/describe':
                        this.handleDescribe(req, res);
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
            console.log(`☸️ Kubernetes kubectl MCP Server running on port ${this.port}`);
            console.log(`🔒 Max execution time: ${this.maxExecutionTime}ms`);
            if (this.allowedNamespaces) {
                console.log(`🔒 Allowed namespaces: ${this.allowedNamespaces.join(', ')}`);
            }
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down kubectl server...');
            this.server.close(() => {
                console.log('✅ kubectl server stopped');
                process.exit(0);
            });
        });
    }

    handleHealth(req, res) {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            service: 'kubectl-mcp-server',
            uptime: process.uptime(),
            maxExecutionTime: this.maxExecutionTime,
            timestamp: new Date().toISOString()
        }));
    }

    async handleClusterInfo(req, res) {
        try {
            const result = await this.executeKubectl(['cluster-info']);

            res.writeHead(result.success ? 200 : 400);
            res.end(JSON.stringify({
                clusterInfo: result.output,
                success: result.success,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    async handleNamespaces(req, res) {
        try {
            const result = await this.executeKubectl(['get', 'namespaces', '-o', 'json']);

            if (result.success) {
                const namespaces = JSON.parse(result.output);
                res.writeHead(200);
                res.end(JSON.stringify({
                    namespaces: namespaces.items,
                    count: namespaces.items.length,
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

    async handlePods(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const namespace = url.searchParams.get('namespace') || 'default';

        if (!this.validateNamespace(namespace)) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: `Namespace '${namespace}' not allowed` }));
            return;
        }

        try {
            const result = await this.executeKubectl(['get', 'pods', '-n', namespace, '-o', 'json']);

            if (result.success) {
                const pods = JSON.parse(result.output);
                res.writeHead(200);
                res.end(JSON.stringify({
                    pods: pods.items,
                    namespace,
                    count: pods.items.length,
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

    async handleDeployments(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const namespace = url.searchParams.get('namespace') || 'default';

        if (!this.validateNamespace(namespace)) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: `Namespace '${namespace}' not allowed` }));
            return;
        }

        try {
            const result = await this.executeKubectl(['get', 'deployments', '-n', namespace, '-o', 'json']);

            if (result.success) {
                const deployments = JSON.parse(result.output);
                res.writeHead(200);
                res.end(JSON.stringify({
                    deployments: deployments.items,
                    namespace,
                    count: deployments.items.length,
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

    async handleServices(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const namespace = url.searchParams.get('namespace') || 'default';

        if (!this.validateNamespace(namespace)) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: `Namespace '${namespace}' not allowed` }));
            return;
        }

        try {
            const result = await this.executeKubectl(['get', 'services', '-n', namespace, '-o', 'json']);

            if (result.success) {
                const services = JSON.parse(result.output);
                res.writeHead(200);
                res.end(JSON.stringify({
                    services: services.items,
                    namespace,
                    count: services.items.length,
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

    async handleLogs(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { namespace = 'default', pod, container, tail = 100 } = JSON.parse(body);

                    if (!this.validateNamespace(namespace)) {
                        res.writeHead(403);
                        res.end(JSON.stringify({ error: `Namespace '${namespace}' not allowed` }));
                        return;
                    }

                    if (!this.sanitizeResourceName(pod)) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid pod name' }));
                        return;
                    }

                    const result = await this.executeKubectl([
                        'logs',
                        '-n', namespace,
                        pod,
                        container ? `-c=${container}` : '',
                        `--tail=${tail}`
                    ]);

                    res.writeHead(result.success ? 200 : 400);
                    res.end(JSON.stringify({
                        logs: result.output,
                        namespace,
                        pod,
                        container,
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

    async handleDescribe(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const namespace = url.searchParams.get('namespace') || 'default';
        const resourceType = url.searchParams.get('type') || 'pod';
        const resourceName = url.searchParams.get('name');

        if (!resourceName || !this.sanitizeResourceName(resourceName)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Valid resource name required' }));
            return;
        }

        if (!this.validateNamespace(namespace)) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: `Namespace '${namespace}' not allowed` }));
            return;
        }

        try {
            const result = await this.executeKubectl(['describe', resourceType, resourceName, '-n', namespace]);

            res.writeHead(result.success ? 200 : 400);
            res.end(JSON.stringify({
                description: result.output,
                namespace,
                resourceType,
                resourceName,
                success: result.success,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    async handleApply(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { namespace = 'default', manifest } = JSON.parse(body);

                    if (!this.validateNamespace(namespace)) {
                        res.writeHead(403);
                        res.end(JSON.stringify({ error: `Namespace '${namespace}' not allowed` }));
                        return;
                    }

                    if (!manifest || typeof manifest !== 'string') {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Manifest required' }));
                        return;
                    }

                    const result = await this.executeKubectl(['apply', '-n', namespace, '-f', '-'], {
                        stdin: manifest
                    });

                    res.writeHead(result.success ? 200 : 400);
                    res.end(JSON.stringify({
                        result: result.output,
                        namespace,
                        success: result.success,
                        timestamp: new Date().toISOString()
                    }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON or manifest' }));
                }
            });
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    async handleDelete(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { namespace = 'default', resourceType, resourceName } = JSON.parse(body);

                    if (!this.validateNamespace(namespace)) {
                        res.writeHead(403);
                        res.end(JSON.stringify({ error: `Namespace '${namespace}' not allowed` }));
                        return;
                    }

                    if (!this.sanitizeResourceName(resourceName)) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid resource name' }));
                        return;
                    }

                    const result = await this.executeKubectl(['delete', resourceType, resourceName, '-n', namespace]);

                    res.writeHead(result.success ? 200 : 400);
                    res.end(JSON.stringify({
                        result: result.output,
                        namespace,
                        resourceType,
                        resourceName,
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
}

// Start server if run directly
if (require.main === module) {
    const port = process.env.PORT || 3003;
    const server = new KubectlMCPServer(port);
    server.start();
}

module.exports = KubectlMCPServer;
