#!/usr/bin/env node

/**
 * Helm MCP Server
 * Provides comprehensive Helm package management for Kubernetes clusters
 */

const http = require('http');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const isDev = process.env.NODE_ENV !== 'production';

class HelmMCPServer {
    constructor(port = 3004) {
        this.port = port;
        this.server = null;
        this.maxExecutionTime = 120000; // 2 minutes for Helm operations
        this.allowedNamespaces = process.env.ALLOWED_NAMESPACES
            ? process.env.ALLOWED_NAMESPACES.split(',').map(ns => ns.trim())
            : null;
        this.helmRepos = new Map();
    }

    validateNamespace(namespace) {
        if (!this.allowedNamespaces) return true;
        return this.allowedNamespaces.includes(namespace) || namespace === 'default';
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
        ];

        return !dangerousPatterns.some(pattern => pattern.test(input));
    }

    executeHelm(args, options = {}) {
        return new Promise((resolve, reject) => {
            const command = `helm ${args.join(' ')}`;
            console.log(`📦 Executing: ${command}`);

            // Validate arguments for security
            for (const arg of args) {
                if (arg.includes('&&') || arg.includes(';') || arg.includes('|') || arg.includes('$')) {
                    reject(new Error(`Dangerous command pattern detected: ${arg}`));
                    return;
                }
            }

            const helm = spawn('helm', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: this.maxExecutionTime,
                env: { ...process.env, HELM_KUBECONFIG: options.kubeconfig }
            });

            let stdout = '';
            let stderr = '';

            helm.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            helm.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            helm.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, output: stdout, command });
                } else {
                    resolve({ success: false, output: stderr, command, exitCode: code });
                }
            });

            helm.on('error', (error) => {
                reject(new Error(`Helm execution failed: ${error.message}`));
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
                    case '/version':
                        this.handleVersion(req, res);
                        break;
                    case '/repos':
                        this.handleRepos(req, res);
                        break;
                    case '/charts':
                        this.handleCharts(req, res);
                        break;
                    case '/releases':
                        this.handleReleases(req, res);
                        break;
                    case '/search':
                        this.handleSearch(req, res);
                        break;
                    case '/install':
                        this.handleInstall(req, res);
                        break;
                    case '/upgrade':
                        this.handleUpgrade(req, res);
                        break;
                    case '/uninstall':
                        this.handleUninstall(req, res);
                        break;
                    case '/values':
                        this.handleValues(req, res);
                        break;
                    case '/template':
                        this.handleTemplate(req, res);
                        break;
                    case '/lint':
                        this.handleLint(req, res);
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
            console.log(`📦 Helm MCP Server running on port ${this.port}`);
            console.log(`🔒 Max execution time: ${this.maxExecutionTime}ms`);
            if (this.allowedNamespaces) {
                console.log(`🔒 Allowed namespaces: ${this.allowedNamespaces.join(', ')}`);
            }
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down helm server...');
            this.server.close(() => {
                console.log('✅ Helm server stopped');
                process.exit(0);
            });
        });
    }

    handleHealth(req, res) {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            service: 'helm-mcp-server',
            uptime: process.uptime(),
            maxExecutionTime: this.maxExecutionTime,
            timestamp: new Date().toISOString()
        }));
    }

    async handleVersion(req, res) {
        try {
            const result = await this.executeHelm(['version']);

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

    async handleRepos(req, res) {
        try {
            const result = await this.executeHelm(['repo', 'list', '-o', 'json']);

            if (result.success) {
                let repos = [];
                try {
                    repos = JSON.parse(result.output);
                } catch {
                    // Fallback for non-JSON output
                    repos = result.output.split('\n').filter(line => line.trim());
                }

                res.writeHead(200);
                res.end(JSON.stringify({
                    repositories: repos,
                    count: Array.isArray(repos) ? repos.length : 0,
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

    async handleCharts(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const repo = url.searchParams.get('repo');

        try {
            const args = ['search', 'repo'];
            if (repo) args.push(repo);

            const result = await this.executeHelm([...args, '-o', 'json']);

            if (result.success) {
                let charts = [];
                try {
                    charts = JSON.parse(result.output);
                } catch {
                    charts = result.output.split('\n').filter(line => line.trim());
                }

                res.writeHead(200);
                res.end(JSON.stringify({
                    charts,
                    repo,
                    count: Array.isArray(charts) ? charts.length : 0,
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

    async handleReleases(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const namespace = url.searchParams.get('namespace') || 'default';

        if (!this.validateNamespace(namespace)) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: `Namespace '${namespace}' not allowed` }));
            return;
        }

        try {
            const result = await this.executeHelm(['list', '-n', namespace, '-o', 'json']);

            if (result.success) {
                let releases = [];
                try {
                    releases = JSON.parse(result.output);
                } catch {
                    releases = result.output.split('\n').filter(line => line.trim());
                }

                res.writeHead(200);
                res.end(JSON.stringify({
                    releases,
                    namespace,
                    count: Array.isArray(releases) ? releases.length : 0,
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

    async handleInstall(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const {
                        releaseName,
                        chart,
                        namespace = 'default',
                        values = {},
                        repo,
                        version
                    } = JSON.parse(body);

                    if (!this.sanitizeInput(releaseName) || !this.sanitizeInput(chart)) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid release name or chart' }));
                        return;
                    }

                    if (!this.validateNamespace(namespace)) {
                        res.writeHead(403);
                        res.end(JSON.stringify({ error: `Namespace '${namespace}' not allowed` }));
                        return;
                    }

                    const args = ['install', releaseName, chart, '-n', namespace];

                    if (repo) args.push('--repo', repo);
                    if (version) args.push('--version', version);

                    // Handle values
                    if (Object.keys(values).length > 0) {
                        const valuesFile = `/tmp/helm-values-${Date.now()}.yaml`;
                        await fs.writeFile(valuesFile, JSON.stringify(values, null, 2));
                        args.push('-f', valuesFile);
                    }

                    const result = await this.executeHelm(args);

                    res.writeHead(result.success ? 200 : 400);
                    res.end(JSON.stringify({
                        result: result.output,
                        releaseName,
                        chart,
                        namespace,
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

    async handleUpgrade(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const {
                        releaseName,
                        chart,
                        namespace = 'default',
                        values = {}
                    } = JSON.parse(body);

                    if (!this.sanitizeInput(releaseName) || !this.sanitizeInput(chart)) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid release name or chart' }));
                        return;
                    }

                    if (!this.validateNamespace(namespace)) {
                        res.writeHead(403);
                        res.end(JSON.stringify({ error: `Namespace '${namespace}' not allowed` }));
                        return;
                    }

                    const args = ['upgrade', releaseName, chart, '-n', namespace];

                    if (Object.keys(values).length > 0) {
                        const valuesFile = `/tmp/helm-values-${Date.now()}.yaml`;
                        await fs.writeFile(valuesFile, JSON.stringify(values, null, 2));
                        args.push('-f', valuesFile);
                    }

                    const result = await this.executeHelm(args);

                    res.writeHead(result.success ? 200 : 400);
                    res.end(JSON.stringify({
                        result: result.output,
                        releaseName,
                        chart,
                        namespace,
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

    async handleUninstall(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { releaseName, namespace = 'default' } = JSON.parse(body);

                    if (!this.sanitizeInput(releaseName)) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid release name' }));
                        return;
                    }

                    if (!this.validateNamespace(namespace)) {
                        res.writeHead(403);
                        res.end(JSON.stringify({ error: `Namespace '${namespace}' not allowed` }));
                        return;
                    }

                    const result = await this.executeHelm(['uninstall', releaseName, '-n', namespace]);

                    res.writeHead(result.success ? 200 : 400);
                    res.end(JSON.stringify({
                        result: result.output,
                        releaseName,
                        namespace,
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

    async handleValues(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const releaseName = url.searchParams.get('release');
        const namespace = url.searchParams.get('namespace') || 'default';

        if (!releaseName || !this.sanitizeInput(releaseName)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Valid release name required' }));
            return;
        }

        if (!this.validateNamespace(namespace)) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: `Namespace '${namespace}' not allowed` }));
            return;
        }

        try {
            const result = await this.executeHelm(['get', 'values', releaseName, '-n', namespace, '-o', 'json']);

            if (result.success) {
                let values = {};
                try {
                    values = JSON.parse(result.output);
                } catch {
                    values = { raw: result.output };
                }

                res.writeHead(200);
                res.end(JSON.stringify({
                    values,
                    releaseName,
                    namespace,
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

    async handleTemplate(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const {
                        chart,
                        values = {},
                        namespace = 'default',
                        name
                    } = JSON.parse(body);

                    if (!this.sanitizeInput(chart) || !this.sanitizeInput(name)) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid chart or name' }));
                        return;
                    }

                    if (!this.validateNamespace(namespace)) {
                        res.writeHead(403);
                        res.end(JSON.stringify({ error: `Namespace '${namespace}' not allowed` }));
                        return;
                    }

                    const args = ['template', name, chart, '-n', namespace];

                    if (Object.keys(values).length > 0) {
                        const valuesFile = `/tmp/helm-values-${Date.now()}.yaml`;
                        await fs.writeFile(valuesFile, JSON.stringify(values, null, 2));
                        args.push('-f', valuesFile);
                    }

                    const result = await this.executeHelm(args);

                    res.writeHead(result.success ? 200 : 400);
                    res.end(JSON.stringify({
                        template: result.output,
                        name,
                        chart,
                        namespace,
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

    async handleLint(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { chart, values = {} } = JSON.parse(body);

                    if (!this.sanitizeInput(chart)) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid chart path' }));
                        return;
                    }

                    const args = ['lint', chart];

                    if (Object.keys(values).length > 0) {
                        const valuesFile = `/tmp/helm-values-${Date.now()}.yaml`;
                        await fs.writeFile(valuesFile, JSON.stringify(values, null, 2));
                        args.push('-f', valuesFile);
                    }

                    const result = await this.executeHelm(args);

                    res.writeHead(result.success ? 200 : 400);
                    res.end(JSON.stringify({
                        lintResult: result.output,
                        chart,
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
    const port = process.env.PORT || 3004;
    const server = new HelmMCPServer(port);
    server.start();
}

module.exports = HelmMCPServer;
