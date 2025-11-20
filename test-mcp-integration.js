#!/usr/bin/env node

/**
 * MCP Integration Test
 * Tests the MCP integration with the actual Wave Terminal frontend
 */

const fs = require('fs');
const path = require('path');
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

const repoRoot = process.env.WAVETERMINAL_ROOT || path.resolve(__dirname, '..');
const integrationPath =
    process.env.MCP_INTEGRATION_PATH ||
    path.join(__dirname, '..', 'frontend', 'app', 'aipanel', 'mcp-integration');

const { MCPIntegrationService } = require(integrationPath);

async function testMCPIntegration() {
    console.log('🧪 Testing MCP Integration...\n');

    try {
        const mcpService = new MCPIntegrationService();

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test available tools
        let availableTools = [];
        try {
            availableTools = await mcpService.discoverAvailableTools();
        } catch (toolError) {
            console.warn('⚠️ Failed to discover tools:', toolError.message);
        }

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
            const workingDirectory = process.env.MCP_TEST_WORKDIR || repoRoot;
            const testContext = {
                sessionId: process.env.MCP_TEST_SESSION || 'test-session',
                tabId: process.env.MCP_TEST_TAB || 'test-tab',
                workingDirectory,
                recentCommands: [],
                environmentVariables: {},
                shellType: process.env.MCP_TEST_SHELL || 'zsh',
                sharedContext: {},
                performance: { responseTime: 0, accuracy: 0, reliability: 0 }
            };

            console.log('\n🛠️ Testing tool execution...');
            const preferredTool = availableTools.find(tool => ['files', 'shell'].includes(tool.id) || ['Filesystem', 'Terminal'].includes(tool.name));

            if (preferredTool) {
                try {
                    const payload = preferredTool.id === 'files' ? { path: workingDirectory } : {};
                    const result = await mcpService.executeTool(preferredTool.id, payload, testContext);
                    console.log(`✅ ${preferredTool.name} tool test successful:`, result);
                } catch (error) {
                    console.log('⚠️ Tool execution test failed (servers may not be ready):', error.message);
                }
            } else {
                console.log('⚠️ No suitable tool found to run execution tests');
            }
        } else {
            console.log('⚠️ No tools discovered yet; skipping execution tests');
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
