#!/usr/bin/env node

/**
 * MCP Integration Test
 * Tests all MCP servers for Wave Terminal
 */

const { execSync } = require('child_process');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

const MCP_SERVERS = [
    { name: 'Memory', port: 13000, path: '/health' },
    { name: 'Filesystem', port: 13001, path: '/health' },
    { name: 'Terminal', port: 13002, path: '/health' },
    { name: 'Kubectl', port: 13003, path: '/health' },
    { name: 'Helm', port: 13004, path: '/health' },
    { name: 'Minikube', port: 13005, path: '/health' }
];

class MCPIntegrationTest {
    constructor() {
        this.testResults = new Map();
        this.serverProcesses = [];
    }

    async runTests() {
        console.log('🚀 Starting MCP Server Integration Tests\n');

        // 1. Start all MCP servers
        await this.startMcpServers();

        // 2. Test server connectivity
        await this.testServerConnectivity();

        // 3. Test inter-server communication
        await this.testInterServerCommunication();

        // 4. Test error handling and recovery
        await this.testErrorHandling();

        // 5. Display test summary
        this.displayResults();

        // 6. Clean up
        this.cleanup();
    }

    async startMcpServers() {
        console.log('🔌 Starting MCP servers...');

        for (const server of MCP_SERVERS) {
            try {
                const serverScript = `mcp-servers/${server.name.toLowerCase()}-mcp-server.js`;
                const proc = spawn('node', [serverScript]);

                proc.stdout.on('data', (data) => {
                    console.log(`[${server.name}]: ${data}`);
                });

                proc.stderr.on('data', (data) => {
                    console.error(`[${server.name} ERROR]: ${data}`);
                });

                this.serverProcesses.push({
                    name: server.name,
                    process: proc
                });

                // Give server time to start
                await new Promise(resolve => setTimeout(resolve, 1000));

                console.log(`✅ ${server.name} server started`);
            } catch (error) {
                console.error(`❌ Failed to start ${server.name} server:`, error);
            }
        }

        console.log('\n⌛ Waiting for servers to initialize...');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    async testServerConnectivity() {
        console.log('\n🌐 Testing server connectivity...');

        for (const server of MCP_SERVERS) {
            try {
                const healthUrl = `http://localhost:${server.port}${server.path}`;
                const response = await this.makeRequest(healthUrl);

                const isHealthy = response && response.status === 'ok';
                this.recordTestResult(server.name, 'Connectivity', isHealthy);

                console.log(`   ${isHealthy ? '✅' : '❌'} ${server.name}: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
                if (!isHealthy) {
                    console.log(`      Response:`, JSON.stringify(response, null, 2));
                }
            } catch (error) {
                console.error(`   ❌ ${server.name} connection failed:`, error.message);
                this.recordTestResult(server.name, 'Connectivity', false, error.message);
            }
        }
    }

    async testInterServerCommunication() {
        console.log('\n🔗 Testing inter-server communication...');

        // Test communication between Memory and Terminal servers as an example
        try {
            const testPayload = {
                command: 'test-command',
                timestamp: new Date().toISOString()
            };

            // Store test data in Memory server
            const storeResponse = await this.makeRequest(
                'http://localhost:13000/api/store',
                'POST',
                { key: 'test-comm', value: testPayload }
            );

            // Retrieve from Terminal server (which should query Memory server)
            const retrieveResponse = await this.makeRequest(
                'http://localhost:13002/api/retrieve/test-comm'
            );

            const isSuccess = retrieveResponse &&
                retrieveResponse.key === 'test-comm' &&
                retrieveResponse.value.command === 'test-command';

            this.recordTestResult('Inter-Server', 'Memory-Terminal', isSuccess);
            console.log(`   ${isSuccess ? '✅' : '❌'} Memory-Terminal Communication: ${isSuccess ? 'Success' : 'Failed'}`);

        } catch (error) {
            console.error('   ❌ Inter-server communication test failed:', error.message);
            this.recordTestResult('Inter-Server', 'Memory-Terminal', false, error.message);
        }
    }

    async testErrorHandling() {
        console.log('\n⚠️  Testing error handling...');

        // Test invalid endpoint
        try {
            await this.makeRequest('http://localhost:13000/invalid-endpoint');
            this.recordTestResult('ErrorHandling', 'InvalidEndpoint', false, 'Expected 404 but got success');
        } catch (error) {
            const isExpectedError = error.message.includes('404');
            this.recordTestResult('ErrorHandling', 'InvalidEndpoint', isExpectedError,
                isExpectedError ? 'Got expected 404' : error.message);
            console.log(`   ${isExpectedError ? '✅' : '❌'} Invalid endpoint handling: ${isExpectedError ? 'Working' : 'Failed'}`);
        }

        // Test malformed request
        try {
            await this.makeRequest('http://localhost:13000/api/store', 'POST', 'invalid-json');
            this.recordTestResult('ErrorHandling', 'MalformedRequest', false, 'Expected 400 but got success');
        } catch (error) {
            const isExpectedError = error.message.includes('400');
            this.recordTestResult('ErrorHandling', 'MalformedRequest', isExpectedError,
                isExpectedError ? 'Got expected 400' : error.message);
            console.log(`   ${isExpectedError ? '✅' : '❌'} Malformed request handling: ${isExpectedError ? 'Working' : 'Failed'}`);
        }
    }

    recordTestResult(category, testName, passed, message = '') {
        if (!this.testResults.has(category)) {
            this.testResults.set(category, []);
        }
        this.testResults.get(category).push({
            test: testName,
            passed,
            message
        });
    }

    displayResults() {
        console.log('\n📊 Test Results:');
        console.log('='.repeat(50));

        let totalTests = 0;
        let passedTests = 0;

        for (const [category, tests] of this.testResults.entries()) {
            console.log(`\n${category}:`);
            for (const test of tests) {
                totalTests++;
                if (test.passed) passedTests++;

                console.log(`  ${test.passed ? '✅' : '❌'} ${test.test}`);
                if (!test.passed && test.message) {
                    console.log(`     ${test.message}`);
                }
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`🏁 Test Summary: ${passedTests}/${totalTests} tests passed`);
        console.log('='.repeat(50));
    }

    cleanup() {
        console.log('\n🧹 Cleaning up...');
        for (const { name, process: proc } of this.serverProcesses) {
            try {
                if (!proc.killed) {
                    proc.kill();
                    console.log(`   Stopped ${name} server`);
                }
            } catch (error) {
                console.error(`   Failed to stop ${name} server:`, error.message);
            }
        }
    }

    makeRequest(url, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const lib = url.startsWith('https') ? https : http;
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 5000
            };

            const req = lib.request(url, options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 400) {
                        reject(new Error(`Request failed with status code ${res.statusCode}: ${responseData}`));
                        return;
                    }

                    try {
                        const jsonResponse = responseData ? JSON.parse(responseData) : {};
                        resolve(jsonResponse);
                    } catch (e) {
                        resolve(responseData || 'OK');
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timed out'));
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new MCPIntegrationTest();

    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT. Cleaning up...');
        tester.cleanup();
        process.exit(0);
    });

    // Run tests
    tester.runTests().catch(error => {
        console.error('❌ Test runner failed:', error);
        tester.cleanup();
        process.exit(1);
    });
}

module.exports = MCPIntegrationTest;
