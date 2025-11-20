#!/usr/bin/env node

/**
 * Service Monitor - Real-time monitoring of the perpetual upgrade service
 */

const fs = require('fs');
const path = require('path');

class ServiceMonitor {
    constructor() {
        this.logFile = path.join(__dirname, '..', 'perpetual-upgrade.log');
        this.serviceLogFile = path.join(__dirname, '..', 'perpetual-service.log');
        this.isMonitoring = false;
    }

    start() {
        this.isMonitoring = true;
        console.log('📊 Wave Terminal Service Monitor Started');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        this.showStatus();
        this.startLogTailing();
        
        // Update status every 10 seconds
        setInterval(() => {
            if (this.isMonitoring) {
                this.showStatus();
            }
        }, 10000);

        process.on('SIGINT', () => {
            this.isMonitoring = false;
            console.log('\n👋 Service monitor stopped');
            process.exit(0);
        });
    }

    showStatus() {
        const pidFile = path.join(__dirname, '..', 'perpetual-service.pid');
        
        console.clear();
        console.log('🔄 Wave Terminal Perpetual Upgrade Service Monitor');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Service status
        if (fs.existsSync(pidFile)) {
            const pid = fs.readFileSync(pidFile, 'utf8').trim();
            console.log(`✅ Service Status: RUNNING (PID: ${pid})`);
        } else {
            console.log('❌ Service Status: STOPPED');
        }

        // MCP Server status
        this.checkMCPStatus();
        
        // Recent activity
        this.showRecentActivity();
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Press Ctrl+C to stop monitoring');
    }

    async checkMCPStatus() {
        const ports = [
            { port: 13000, name: 'Memory' },
            { port: 13001, name: 'Filesystem' },
            { port: 13002, name: 'Terminal' },
            { port: 13007, name: 'OpenMemory' },
            { port: 13008, name: 'SuperMemory' }
        ];

        console.log('\n🧠 MCP Server Status:');
        
        for (const server of ports) {
            try {
                const http = require('http');
                await new Promise((resolve, reject) => {
                    const req = http.get(`http://localhost:${server.port}/health`, (res) => {
                        console.log(`  🟢 ${server.name} (${server.port}): HEALTHY`);
                        resolve();
                    });
                    req.on('error', () => {
                        console.log(`  🔴 ${server.name} (${server.port}): DOWN`);
                        resolve();
                    });
                    req.setTimeout(1000, () => {
                        console.log(`  🟡 ${server.name} (${server.port}): TIMEOUT`);
                        req.destroy();
                        resolve();
                    });
                });
            } catch {
                console.log(`  🔴 ${server.name} (${server.port}): ERROR`);
            }
        }
    }

    showRecentActivity() {
        console.log('\n📝 Recent Activity:');
        
        if (fs.existsSync(this.logFile)) {
            const logs = fs.readFileSync(this.logFile, 'utf8')
                .split('\n')
                .filter(line => line.trim())
                .slice(-5);
            
            logs.forEach(log => {
                const timestamp = log.match(/\[(.*?)\]/)?.[1];
                const message = log.replace(/\[.*?\]\s*/, '');
                if (timestamp && message) {
                    const time = new Date(timestamp).toLocaleTimeString();
                    console.log(`  ${time}: ${message}`);
                }
            });
        } else {
            console.log('  No activity logs found');
        }
    }

    startLogTailing() {
        if (fs.existsSync(this.logFile)) {
            const { spawn } = require('child_process');
            const tail = spawn('tail', ['-f', this.logFile]);
            
            tail.stdout.on('data', (data) => {
                // Process new log entries in real-time if needed
            });
        }
    }
}

if (require.main === module) {
    const monitor = new ServiceMonitor();
    monitor.start();
}

module.exports = ServiceMonitor;