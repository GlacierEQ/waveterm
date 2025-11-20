#!/usr/bin/env node

/**
 * MCP Server Health Check
 * Basic health check for MCP servers
 */

const http = require('http');

const MCP_SERVERS = [
    { name: 'Memory', port: 13000 },
    { name: 'Filesystem', port: 13001 },
    { name: 'Terminal', port: 13002 },
    { name: 'Kubectl', port: 13003 },
    { name: 'Helm', port: 13004 },
    { name: 'Minikube', port: 13005 }
];

async function checkServer(server) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${server.port}/health`, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve({
                        ...server,
                        status: 'running',
                        statusCode: res.statusCode,
                        response: result
                    });
                } catch (e) {
                    resolve({
                        ...server,
                        status: 'error',
                        error: 'Invalid JSON response'
                    });
                }
            });
        });

        req.on('error', (error) => {
            resolve({
                ...server,
                status: 'down',
                error: error.message
            });
        });

        req.setTimeout(2000, () => {
            req.destroy();
            resolve({
                ...server,
                status: 'timeout',
                error: 'Request timed out'
            });
        });
    });
}

async function main() {
    console.log('🔍 Checking MCP Server Health...\n');

    const results = await Promise.all(
        MCP_SERVERS.map(server => checkServer(server))
    );

    // Display results
    console.log('MCP Server Status:');
    console.log('=================');

    let allHealthy = true;

    for (const result of results) {
        const status = result.status === 'running' ? '✅' : '❌';
        const details = result.status === 'running'
            ? `(HTTP ${result.statusCode})`
            : `- ${result.error}`;

        console.log(`${status} ${result.name.padEnd(12)}: ${result.status.toUpperCase()} ${details}`);

        if (result.status !== 'running') {
            allHealthy = false;
        }
    }

    console.log('\n💡 Next Steps:');
    if (allHealthy) {
        console.log('All MCP servers are running! You can proceed with integration testing.');
    } else {
        console.log('Some MCP servers are not running. You may need to start them first.');
        console.log('To start all MCP servers, run: npm run mcp:start');
        console.log('For development with auto-reload: npm run mcp:dev');
    }
}

main().catch(console.error);
