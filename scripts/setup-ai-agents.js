#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🤖 Setting up AI agents...');

const agents = [
    'command_analysis',
    'context_manager',
    'command_explanation',
    'pattern_analysis',
    'security_monitor',
    'optimization_engine',
    'mcp_integration',
    'coordinator'
];

const frontendDir = path.join(__dirname, '..', 'frontend', 'app', 'aipanel');

// Check if all AI components exist
const missingComponents = [];
agents.forEach(agent => {
    const componentPath = path.join(frontendDir, `${agent}-agent.tsx`);
    if (!fs.existsSync(componentPath)) {
        missingComponents.push(agent);
    }
});

if (missingComponents.length > 0) {
    console.log(`⚠️  Missing AI components: ${missingComponents.join(', ')}`);
    console.log('Run the full AI integration to create these components.');
} else {
    console.log('✅ All AI agent components are present');
}

// Update environment
if (!fs.existsSync(path.join(__dirname, '..', '.env'))) {
    console.log('📝 Creating .env file...');
    const envContent = `# AI Agent Configuration
AI_ENABLED=true
AGENT_COORDINATION=true
MCP_INTEGRATION=true
SECURITY_MONITORING=true
OPTIMIZATION_ENGINE=true

# Performance Settings
MAX_AGENTS=8
RESPONSE_TIMEOUT=5000
ACCURACY_THRESHOLD=0.8
`;

    fs.writeFileSync(path.join(__dirname, '..', '.env'), envContent);
}

console.log('🎉 AI agent setup complete!');
