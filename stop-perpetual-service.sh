#!/bin/bash

# Stop Perpetual Upgrade Service

echo "🛑 Stopping Wave Terminal Perpetual Upgrade Service..."

if [ -f perpetual-service.pid ]; then
    PID=$(cat perpetual-service.pid)
    echo "Found service PID: $PID"
    
    if kill -0 $PID 2>/dev/null; then
        echo "Stopping service..."
        kill -TERM $PID
        sleep 2
        
        if kill -0 $PID 2>/dev/null; then
            echo "Force stopping service..."
            kill -KILL $PID
        fi
        
        echo "✅ Service stopped"
    else
        echo "Service not running"
    fi
    
    rm -f perpetual-service.pid
else
    echo "No PID file found, attempting to find and stop service..."
    pkill -f "perpetual-upgrade-service.js"
    echo "✅ Service stopped"
fi

# Also stop any MCP servers
echo "🧠 Stopping MCP servers..."
node mcp-servers/mcp-server-manager.js stop 2>/dev/null || true

echo "🏁 All services stopped"