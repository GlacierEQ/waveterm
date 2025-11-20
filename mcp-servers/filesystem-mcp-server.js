#!/usr/bin/env node

/**
 * Filesystem MCP Server
 * Provides secure file system access and management for the Wave Terminal AI system
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const DEFAULT_ALLOWED_PATHS = [
    '/Users/macarena1/waveterm',
    '/Users/macarena1/Documents'
];

const isDev = process.env.NODE_ENV !== 'production';

class FilesystemMCPServer {
    constructor(port = 3001, options = {}) {
        this.port = port;
        const envAllowedPaths = process.env.ALLOWED_PATHS
            ? process.env.ALLOWED_PATHS
                .split(path.delimiter)
                .map(p => p.trim())
                .filter(Boolean)
            : null;

        const configuredPaths = Array.isArray(options.allowedPaths) && options.allowedPaths.length > 0
            ? options.allowedPaths
            : envAllowedPaths;

        this.allowedPaths = (configuredPaths && configuredPaths.length > 0 ? configuredPaths : DEFAULT_ALLOWED_PATHS)
            .map(p => path.resolve(p));

        this.maxFileSize = options.maxFileSize ?? 10 * 1024 * 1024; // 10MB
        this.server = null;
    }

    isPathAllowed(filePath) {
        const resolvedPath = path.resolve(filePath);
        return this.allowedPaths.some(allowedPath => {
            const normalizedAllowed = allowedPath.endsWith(path.sep)
                ? allowedPath
                : `${allowedPath}${path.sep}`;
            return resolvedPath === allowedPath || resolvedPath.startsWith(normalizedAllowed);
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
                    case '/files':
                        this.handleFiles(req, res);
                        break;
                    case '/file':
                        this.handleFile(req, res);
                        break;
                    case '/search':
                        this.handleFileSearch(req, res);
                        break;
                    case '/tree':
                        this.handleDirectoryTree(req, res);
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
            console.log(`📁 Filesystem MCP Server running on port ${this.port}`);
            console.log(`🔒 Allowed paths: ${this.allowedPaths.join(', ')}`);
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down filesystem server...');
            this.server.close(() => {
                console.log('✅ Filesystem server stopped');
                process.exit(0);
            });
        });
    }

    handleHealth(req, res) {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            uptime: process.uptime(),
            allowedPaths: this.allowedPaths,
            maxFileSize: this.maxFileSize,
            timestamp: new Date().toISOString()
        }));
    }

    async handleFiles(req, res) {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://localhost:${this.port}`);
            const filePath = url.searchParams.get('path');

            if (!filePath) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Path parameter required' }));
                return;
            }

            if (!this.isPathAllowed(filePath)) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'Access denied' }));
                return;
            }

            try {
                const stats = await fs.stat(filePath);
                const isDirectory = stats.isDirectory();

                if (isDirectory) {
                    const files = await fs.readdir(filePath);
                    const fileDetails = await Promise.all(
                        files.map(async (file) => {
                            const fileStats = await fs.stat(path.join(filePath, file));
                            return {
                                name: file,
                                path: path.join(filePath, file),
                                size: fileStats.size,
                                isDirectory: fileStats.isDirectory(),
                                modified: fileStats.mtime,
                                created: fileStats.birthtime
                            };
                        })
                    );

                    res.writeHead(200);
                    res.end(JSON.stringify(fileDetails));
                } else {
                    // Single file info
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        name: path.basename(filePath),
                        path: filePath,
                        size: stats.size,
                        isDirectory: false,
                        modified: stats.mtime,
                        created: stats.birthtime
                    }));
                }
            } catch (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'File not found' }));
                } else {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: error.message }));
                }
            }
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    async handleFile(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const paths = url.searchParams.getAll('path').filter(Boolean);

        if (paths.length === 0) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Path parameter required' }));
            return;
        }

        const disallowedPath = paths.find(filePath => !this.isPathAllowed(filePath));
        if (disallowedPath) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: `Access denied: ${disallowedPath}` }));
            return;
        }

        if (req.method === 'GET') {
            try {
                const results = await Promise.all(paths.map(async (filePath) => {
                    const stats = await fs.stat(filePath);

                    if (stats.isDirectory()) {
                        throw new Error(`Path is a directory: ${filePath}`);
                    }

                    if (stats.size > this.maxFileSize) {
                        throw new Error(`File too large: ${filePath}`);
                    }

                    const content = await fs.readFile(filePath, 'utf8');
                    return {
                        path: filePath,
                        content,
                        size: stats.size,
                        encoding: 'utf8'
                    };
                }));

                res.writeHead(200);
                res.end(JSON.stringify(results.length === 1 ? results[0] : results));
            } catch (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'File not found' }));
                } else if (error.message?.startsWith('Path is a directory') || error.message?.startsWith('File too large')) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: error.message }));
                } else {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: error.message || 'Unknown error' }));
                }
            }
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    async handleFileSearch(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { query, searchPath = this.allowedPaths[0], fileTypes = [] } = JSON.parse(body);

                    if (!this.isPathAllowed(searchPath)) {
                        res.writeHead(403);
                        res.end(JSON.stringify({ error: 'Access denied' }));
                        return;
                    }

                    const results = await this.searchFiles(query, searchPath, fileTypes);

                    res.writeHead(200);
                    res.end(JSON.stringify({
                        query,
                        searchPath,
                        results,
                        count: results.length
                    }));
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

    async searchFiles(query, searchPath, fileTypes) {
        const results = [];

        async function searchDirectory(dirPath) {
            try {
                const items = await fs.readdir(dirPath);

                for (const item of items) {
                    const itemPath = path.join(dirPath, item);
                    const stats = await fs.stat(itemPath);

                    if (stats.isDirectory()) {
                        // Skip node_modules and other common directories
                        if (!['node_modules', '.git', '.cache', 'dist', 'build'].includes(item)) {
                            await searchDirectory(itemPath);
                        }
                    } else {
                        // Check file type filter
                        if (fileTypes.length > 0) {
                            const ext = path.extname(item).toLowerCase();
                            if (!fileTypes.includes(ext)) continue;
                        }

                        // Check if file contains query
                        try {
                            const content = await fs.readFile(itemPath, 'utf8');
                            if (content.toLowerCase().includes(query.toLowerCase())) {
                                results.push({
                                    path: itemPath,
                                    name: item,
                                    size: stats.size,
                                    modified: stats.mtime
                                });
                            }
                        } catch {
                            // Skip binary files or files that can't be read
                        }
                    }
                }
            } catch (error) {
                // Skip directories that can't be accessed
            }
        }

        await searchDirectory(searchPath);
        return results.slice(0, 100); // Limit results
    }

    async handleDirectoryTree(req, res) {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://localhost:${this.port}`);
            const dirPath = url.searchParams.get('path') || this.allowedPaths[0];

            if (!this.isPathAllowed(dirPath)) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'Access denied' }));
                return;
            }

            try {
                const tree = await this.buildDirectoryTree(dirPath);
                res.writeHead(200);
                res.end(JSON.stringify(tree));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    async buildDirectoryTree(dirPath, maxDepth = 3, currentDepth = 0) {
        const stats = await fs.stat(dirPath);

        if (!stats.isDirectory()) {
            return {
                name: path.basename(dirPath),
                path: dirPath,
                type: 'file',
                size: stats.size
            };
        }

        if (currentDepth >= maxDepth) {
            return {
                name: path.basename(dirPath),
                path: dirPath,
                type: 'directory',
                truncated: true
            };
        }

        const items = await fs.readdir(dirPath);
        const children = [];

        for (const item of items.slice(0, 50)) { // Limit items per directory
            const itemPath = path.join(dirPath, item);
            try {
                const itemStats = await fs.stat(itemPath);

                if (itemStats.isDirectory() && !['node_modules', '.git', '.cache'].includes(item)) {
                    children.push(await this.buildDirectoryTree(itemPath, maxDepth, currentDepth + 1));
                } else if (itemStats.isFile()) {
                    children.push({
                        name: item,
                        path: itemPath,
                        type: 'file',
                        size: itemStats.size
                    });
                }
            } catch {
                // Skip items that can't be accessed
            }
        }

        return {
            name: path.basename(dirPath),
            path: dirPath,
            type: 'directory',
            children: children,
            totalItems: items.length,
            shownItems: children.length
        };
    }
}

// Start server if run directly
if (require.main === module) {
    const port = process.env.PORT || 3001;
    const cliAllowedPaths = process.env.ALLOWED_PATHS
        ? process.env.ALLOWED_PATHS
            .split(path.delimiter)
            .map(p => p.trim())
            .filter(Boolean)
        : undefined;

    const server = new FilesystemMCPServer(port, {
        allowedPaths: cliAllowedPaths
    });
    server.start();
}

module.exports = FilesystemMCPServer;
