#!/bin/bash

# Stop any running MCP servers
echo "🛑 Stopping any running MCP servers..."
pkill -f "node.*mcp" || true

# Start MCP servers with proper ports
echo "🚀 Starting MCP servers..."

# Start Memory MCP Server
node mcp-servers/memory-mcp-server.js 13000 &

# Start Filesystem MCP Server
node mcp-servers/filesystem-mcp-server.js 13001 &

# Start Terminal MCP Server
node mcp-servers/terminal-mcp-server.js 13002 &

# Start Kubectl MCP Server
node mcp-servers/kubectl-mcp-server.js 13003 &

# Start Helm MCP Server
node mcp-servers/helm-mcp-server.js 13004 &

# Start Minikube MCP Server
node mcp-servers/minikube-mcp-server.js 13005 &

# Start Docker MCP Server
node mcp-servers/docker-mcp-server.js 13006 &

# Start OpenMemory MCP Server
node mcp-servers/openmemory-mcp-server.js 13007 &

# Start SuperMemory MCP Server
node mcp-servers/supermemory-mcp-server.js 13008 &

# Wait for all background processes to complete
wait

echo "✅ All MCP servers started successfully!"
echo "🔌 MCP Servers running on ports 13000-13008"
