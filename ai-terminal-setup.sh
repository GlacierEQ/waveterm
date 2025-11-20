#!/usr/bin/env bash
set -euo pipefail

# Wave Terminal AI helpers
export WAVE_AI_ENABLED=${WAVE_AI_ENABLED:-true}
export WAVE_MCP_PORT=${WAVE_MCP_PORT:-3000}
export WAVE_SECURITY_LEVEL=${WAVE_SECURITY_LEVEL:-high}

echo "Wave Terminal AI environment initialized"

echo "  • WAVE_AI_ENABLED=${WAVE_AI_ENABLED}"
echo "  • WAVE_MCP_PORT=${WAVE_MCP_PORT}"
echo "  • WAVE_SECURITY_LEVEL=${WAVE_SECURITY_LEVEL}"

if [ "${WAVE_START_MCP_SERVERS:-false}" = "true" ]; then
    if command -v node >/dev/null 2>&1; then
        echo "🚀 Launching MCP servers (background)..."
        node mcp-servers/mcp-server-manager.js start &
        disown
    else
        echo "⚠️  Node.js not found; cannot start MCP servers"
    fi
fi
