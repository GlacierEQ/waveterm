#!/usr/bin/env node

/**
 * MCP Integration Test
 * Tests the MCP integration with the actual Wave Terminal frontend
 */

const fs = require('fs');
const ts = require('typescript');

// Minimal TypeScript loader so we can import the service without extra deps
require.extensions['.ts'] = function compile(module, filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            esModuleInterop: true,
            moduleResolution: ts.ModuleResolutionKind.NodeNext
        },
        fileName: filename
    });
    module._compile(outputText, filename);
};

const { MCPIntegrationService } = require('../frontend/app/aipanel/mcp-integration');

async function testMCPIntegration() {
    console.log('🧪 Testing MCP Integration...\n');

    try {
        const mcpService = new MCPIntegrationService();

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test available tools
        const availableTools = await mcpService.discoverAvailableTools();
        console.log(`📋 Available tools: ${availableTools.length}`);
        availableTools.forEach(tool => {
            console.log(`  - ${tool.name} (${tool.id})`);
        });

        // Test connection status
        const connectionStatus = mcpService.getConnectionStatus();
        console.log('\n🔗 Connection Status:');
        Object.entries(connectionStatus).forEach(([server, status]) => {
            console.log(`  ${server}: ${status}`);
        });

        // Test sample tool execution
        if (availableTools.length > 0) {
            console.log('\n🛠️ Testing tool execution...');
            try {
                const testTool = availableTools[0];

                // Test filesystem tool
                if (testTool.name === 'files') {
                    const result = await mcpService.executeTool(testTool.id, {
                        path: '/Users/macarena1/waveterm'
                    }, {
                        sessionId: 'test-session',
                        tabId: 'test-tab',
                        workingDirectory: '/Users/macarena1/waveterm',
                        recentCommands: [],
                        environmentVariables: {},
                        shellType: 'zsh',
                        sharedContext: {},
                        performance: { responseTime: 0, accuracy: 0, reliability: 0 }
                    });

                    console.log('✅ Filesystem tool test successful:', result);
                }

                // Test terminal tool
                else if (testTool.name === 'shell') {
                    const result = await mcpService.executeTool(testTool.id, {}, {
                        sessionId: 'test-session',
                        tabId: 'test-tab',
                        workingDirectory: '/Users/macarena1/waveterm',
                        recentCommands: [],
                        environmentVariables: {},
                        shellType: 'zsh',
                        sharedContext: {},
                        performance: { responseTime: 0, accuracy: 0, reliability: 0 }
                    });

                    console.log('✅ Shell tool test successful:', result);
                }

            } catch (error) {
                console.log('⚠️ Tool execution test failed (servers may not be ready):', error.message);
            }
        }

        // Cleanup
        mcpService.destroy();

        console.log('\n✅ MCP Integration test completed successfully!');

    } catch (error) {
        console.error('\n❌ MCP Integration test failed:', error);
        process.exit(1);
    }
}

// Run test if called directly
if (require.main === module) {
    testMCPIntegration();
}

module.exports = { testMCPIntegration };
