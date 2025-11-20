#!/usr/bin/env node

/**
 * Terminal MCP Server
 * Provides terminal command execution and shell integration for the Wave Terminal AI system
 */

const http = require('http');
const { spawn } = require('child_process');
const os = require('os');
const isDev = process.env.NODE_ENV !== 'production';

class TerminalMCPServer {
    constructor(port = 3002) {
        this.port = port;
        this.activeCommands = new Map();
        this.commandHistory = [];
        this.maxHistorySize = 100;
        this.server = null;
        this.shell = this.detectShell();
    }

    detectShell() {
        const platform = os.platform();
        switch (platform) {
            case 'darwin':
            case 'linux':
                return process.env.SHELL || '/bin/bash';
            case 'win32':
                return process.env.COMSPEC || 'cmd.exe';
            default:
                return '/bin/bash';
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
                    case '/execute':
                        this.handleExecute(req, res);
                        break;
                    case '/commands':
                        this.handleCommands(req, res);
                        break;
                    case '/history':
                        this.handleHistory(req, res, url);
                        break;
                    case '/shell':
                        this.handleShell(req, res);
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
            console.log(`💻 Terminal MCP Server running on port ${this.port}`);
            console.log(`🐚 Shell: ${this.shell}`);
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down terminal server...');
            this.server.close(() => {
                console.log('✅ Terminal server stopped');
                process.exit(0);
            });
        });
    }

    handleHealth(req, res) {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            uptime: process.uptime(),
            shell: this.shell,
            activeCommands: this.activeCommands.size,
            historySize: this.commandHistory.length,
            timestamp: new Date().toISOString()
        }));
    }

    handleExecute(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { command, cwd, timeout = 30000 } = JSON.parse(body);

                    if (!command || typeof command !== 'string') {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Command is required' }));
                        return;
                    }

                    // Security: Basic command validation
                    if (this.isDangerousCommand(command)) {
                        res.writeHead(403);
                        res.end(JSON.stringify({ error: 'Dangerous command blocked' }));
                        return;
                    }

                    const commandId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
                    this.executeCommand(commandId, command, cwd, timeout, (result) => {
                        res.writeHead(200);
                        res.end(JSON.stringify({
                            id: commandId,
                            command,
                            ...result
                        }));

                        // Add to history
                        this.addToHistory({
                            id: commandId,
                            command,
                            cwd: cwd || process.cwd(),
                            timestamp: new Date().toISOString(),
                            ...result
                        });
                    });

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

    executeCommand(commandId, command, cwd, timeout, callback) {
        const startTime = Date.now();
        const workingDir = cwd || process.cwd();

        const cmd = spawn(this.shell, ['-c', command], {
            cwd: workingDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, PWD: workingDir }
        });

        this.activeCommands.set(commandId, cmd);

        let stdout = '';
        let stderr = '';

        cmd.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        cmd.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        cmd.on('close', (code) => {
            this.activeCommands.delete(commandId);

            const executionTime = Date.now() - startTime;
            const success = code === 0;

            callback({
                success,
                exitCode: code,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                executionTime,
                workingDir
            });
        });

        cmd.on('error', (error) => {
            this.activeCommands.delete(commandId);
            callback({
                success: false,
                exitCode: -1,
                stdout: '',
                stderr: error.message,
                executionTime: Date.now() - startTime,
                workingDir
            });
        });

        // Timeout handling
        if (timeout > 0) {
            setTimeout(() => {
                if (this.activeCommands.has(commandId)) {
                    cmd.kill('SIGTERM');
                    setTimeout(() => {
                        if (this.activeCommands.has(commandId)) {
                            cmd.kill('SIGKILL');
                        }
                    }, 5000);
                }
            }, timeout);
        }
    }

    isDangerousCommand(command) {
        const dangerousPatterns = [
            // File system destruction
            /rm\s+-rf/i,
            /rm\s+--recursive.*--force/i,
            /sudo\s+rm/i,
            /dd\s+/i,
            /mkfs/i,
            /fdisk/i,

            // System modification
            /chmod\s+777/i,
            /chown\s+/i,
            /mount.*-o.*remount/i,
            /systemctl/i,
            /service\s+/i,

            // Network and security
            /iptables/i,
            /ufw/i,
            /ssh/i,
            /nc\s+/i,
            /netcat/i,

            // Process manipulation
            /kill\s+-9/i,
            /killall/i,
            /pkill/i,

            // Package management (can install malware)
            /apt\s+/i,
            /yum/i,
            /brew/i,
            /pip/i,
            /npm/i,
            /node/i,

            // Dangerous scripting
            /eval\s+/i,
            /exec\s+/i,
            /source\s+/i,

            // File redirection that could overwrite system files
            />\s*\/etc\//i,
            />\s*\/usr\//i,
            />\s*\/bin\//i,
            />\s*\/sys\//i
        ];

        // Check for dangerous patterns
        if (dangerousPatterns.some(pattern => pattern.test(command))) {
            return true;
        }

        // Check for suspicious command chains
        const suspiciousChains = [
            /;\s*rm/i,
            /&&\s*rm/i,
            /\|\s*rm/i,
            /;\s*sudo/i,
            /&&\s*sudo/i,
            /\|\s*sudo/i
        ];

        return suspiciousChains.some(pattern => pattern.test(command));
    }

    handleCommands(req, res) {
        if (req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify({
                active: Array.from(this.activeCommands.keys()),
                count: this.activeCommands.size
            }));
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    handleHistory(req, res, url) {
        if (req.method === 'GET') {
            const limitParam = url?.searchParams?.get('limit');
            const parsedLimit = Number(limitParam);
            const boundedLimit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 200)) : 50;
            const history = this.commandHistory
                .slice(-boundedLimit)
                .reverse();

            res.writeHead(200);
            res.end(JSON.stringify(history));
        } else if (req.method === 'DELETE') {
            this.commandHistory = [];
            res.writeHead(200);
            res.end(JSON.stringify({ message: 'History cleared' }));
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    handleShell(req, res) {
        res.writeHead(200);
        res.end(JSON.stringify({
            shell: this.shell,
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            user: os.userInfo().username,
            home: os.homedir(),
            cwd: process.cwd()
        }));
    }

    addToHistory(entry) {
        this.commandHistory.push(entry);

        // Maintain history size limit
        if (this.commandHistory.length > this.maxHistorySize) {
            this.commandHistory = this.commandHistory.slice(-this.maxHistorySize);
        }
    }
}

// Start server if run directly
if (require.main === module) {
    const port = process.env.PORT || 3002;
    const server = new TerminalMCPServer(port);
    server.start();
}

module.exports = TerminalMCPServer;
