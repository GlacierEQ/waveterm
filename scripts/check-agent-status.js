#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking AI agent status...\n');

const frontendDir = path.join(__dirname, '..', 'frontend', 'app', 'aipanel');
const agents = [
    { name: 'Agent Coordinator', file: 'agent-coordinator.ts' },
    { name: 'Suggestions Overlay', file: 'suggestions-overlay.tsx' },
    { name: 'Command Explanation', file: 'command-explanation.tsx' },
    { name: 'Context Visualizer', file: 'context-visualizer.tsx' },
    { name: 'AI Settings', file: 'ai-settings.tsx' },
    { name: 'Security Monitor', file: 'security-monitor.tsx' },
    { name: 'Enhanced Terminal Input', file: 'enhanced-terminal-input.tsx' },
    { name: 'Hyper Intelligent Terminal', file: 'hyper-intelligent-terminal.tsx' },
    { name: 'MCP Integration', file: 'mcp-integration.ts' }
];

let allPresent = true;
agents.forEach(agent => {
    const exists = fs.existsSync(path.join(frontendDir, agent.file));
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${agent.name}`);
    if (!exists) allPresent = false;
});

console.log(`\n${allPresent ? '🎉 All AI agents are ready!' : '⚠️  Some AI agents are missing'}`);

if (allPresent) {
    console.log('\n🚀 You can now run:');
    console.log('   npm run ai:dev    - Start development with AI');
    console.log('   npm run mcp:start - Start MCP servers');
    console.log('   npm run dev       - Start Wave Terminal');
}
