#!/usr/bin/env node

/**
 * OpenMemory MCP Server
 * Advanced memory system with semantic search, knowledge graphs, and AI-powered insights
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

class OpenMemoryMCPServer {
    constructor(port = 13007) {
        this.port = port;
        this.memories = new Map();
        this.knowledgeGraph = new Map();
        this.semanticIndex = new Map();
        this.memoryFile = path.join(__dirname, 'openmemory-store.json');
        this.graphFile = path.join(__dirname, 'knowledge-graph.json');
        this.loadData();
    }

    loadData() {
        try {
            if (fs.existsSync(this.memoryFile)) {
                const data = JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
                this.memories = new Map(Object.entries(data.memories || {}));
                this.semanticIndex = new Map(Object.entries(data.semanticIndex || {}));
            }
            if (fs.existsSync(this.graphFile)) {
                const graph = JSON.parse(fs.readFileSync(this.graphFile, 'utf8'));
                this.knowledgeGraph = new Map(Object.entries(graph));
            }
        } catch (error) {
            console.warn('⚠️ Could not load OpenMemory data:', error.message);
        }
    }

    saveData() {
        try {
            const data = {
                memories: Object.fromEntries(this.memories),
                semanticIndex: Object.fromEntries(this.semanticIndex)
            };
            fs.writeFileSync(this.memoryFile, JSON.stringify(data, null, 2));
            fs.writeFileSync(this.graphFile, JSON.stringify(Object.fromEntries(this.knowledgeGraph), null, 2));
        } catch (error) {
            console.error('❌ Error saving OpenMemory data:', error.message);
        }
    }

    start() {
        this.server = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            const url = new URL(req.url, `http://localhost:${this.port}`);
            
            try {
                switch (url.pathname) {
                    case '/health': this.handleHealth(req, res); break;
                    case '/memory': this.handleMemory(req, res); break;
                    case '/semantic-search': this.handleSemanticSearch(req, res); break;
                    case '/knowledge-graph': this.handleKnowledgeGraph(req, res); break;
                    case '/insights': this.handleInsights(req, res); break;
                    case '/connect': this.handleConnect(req, res); break;
                    default:
                        res.writeHead(404);
                        res.end(JSON.stringify({ error: 'Not found' }));
                }
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        });

        this.server.listen(this.port, () => {
            console.log(`🧠 OpenMemory MCP Server running on port ${this.port}`);
        });
    }

    handleHealth(req, res) {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            memories: this.memories.size,
            knowledgeNodes: this.knowledgeGraph.size,
            semanticEntries: this.semanticIndex.size
        }));
    }

    handleMemory(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const memory = JSON.parse(body);
                const id = `om-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                memory.id = id;
                memory.created = new Date().toISOString();
                memory.type = memory.type || 'semantic';
                memory.importance = memory.importance || 0.5;
                memory.connections = memory.connections || [];
                
                this.memories.set(id, memory);
                this.updateSemanticIndex(memory);
                this.updateKnowledgeGraph(memory);
                this.saveData();

                res.writeHead(201);
                res.end(JSON.stringify({ id, status: 'created' }));
            });
        } else if (req.method === 'GET') {
            const memories = Array.from(this.memories.values());
            res.writeHead(200);
            res.end(JSON.stringify(memories));
        }
    }

    handleSemanticSearch(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { query, limit = 10, threshold = 0.3 } = JSON.parse(body);
                const results = this.performSemanticSearch(query, limit, threshold);
                res.writeHead(200);
                res.end(JSON.stringify({ query, results, count: results.length }));
            });
        }
    }

    handleKnowledgeGraph(req, res) {
        if (req.method === 'GET') {
            const graph = this.buildKnowledgeGraphResponse();
            res.writeHead(200);
            res.end(JSON.stringify(graph));
        }
    }

    handleInsights(req, res) {
        const insights = this.generateInsights();
        res.writeHead(200);
        res.end(JSON.stringify(insights));
    }

    handleConnect(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { sourceId, targetId, relationship, strength = 0.5 } = JSON.parse(body);
                this.createConnection(sourceId, targetId, relationship, strength);
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'connected' }));
            });
        }
    }

    updateSemanticIndex(memory) {
        const keywords = this.extractKeywords(memory.content || memory.text || '');
        keywords.forEach(keyword => {
            if (!this.semanticIndex.has(keyword)) {
                this.semanticIndex.set(keyword, []);
            }
            this.semanticIndex.get(keyword).push({
                memoryId: memory.id,
                relevance: memory.importance || 0.5,
                context: memory.context || {}
            });
        });
    }

    updateKnowledgeGraph(memory) {
        if (!this.knowledgeGraph.has(memory.id)) {
            this.knowledgeGraph.set(memory.id, {
                id: memory.id,
                type: memory.type || 'concept',
                label: memory.title || memory.id,
                properties: memory,
                connections: []
            });
        }
    }

    extractKeywords(text) {
        return text.toLowerCase()
            .split(/\W+/)
            .filter(word => word.length > 2)
            .slice(0, 20);
    }

    performSemanticSearch(query, limit, threshold) {
        const queryKeywords = this.extractKeywords(query);
        const scores = new Map();

        queryKeywords.forEach(keyword => {
            if (this.semanticIndex.has(keyword)) {
                this.semanticIndex.get(keyword).forEach(entry => {
                    const current = scores.get(entry.memoryId) || 0;
                    scores.set(entry.memoryId, current + entry.relevance);
                });
            }
        });

        return Array.from(scores.entries())
            .filter(([_, score]) => score >= threshold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([memoryId, score]) => ({
                memory: this.memories.get(memoryId),
                relevanceScore: score
            }));
    }

    buildKnowledgeGraphResponse() {
        const nodes = Array.from(this.knowledgeGraph.values());
        const edges = [];

        nodes.forEach(node => {
            node.connections.forEach(conn => {
                edges.push({
                    source: node.id,
                    target: conn.targetId,
                    relationship: conn.relationship,
                    strength: conn.strength
                });
            });
        });

        return { nodes, edges, stats: { nodeCount: nodes.length, edgeCount: edges.length } };
    }

    createConnection(sourceId, targetId, relationship, strength) {
        const sourceNode = this.knowledgeGraph.get(sourceId);
        const targetNode = this.knowledgeGraph.get(targetId);

        if (sourceNode && targetNode) {
            sourceNode.connections.push({ targetId, relationship, strength });
            targetNode.connections.push({ targetId: sourceId, relationship: `inverse_${relationship}`, strength });
            this.saveData();
        }
    }

    generateInsights() {
        return {
            totalMemories: this.memories.size,
            knowledgeNodes: this.knowledgeGraph.size,
            topConcepts: this.getTopConcepts(),
            memoryDistribution: this.getMemoryDistribution(),
            connectionDensity: this.calculateConnectionDensity(),
            recentActivity: this.getRecentActivity()
        };
    }

    getTopConcepts() {
        const conceptCounts = new Map();
        Array.from(this.semanticIndex.entries()).forEach(([keyword, entries]) => {
            conceptCounts.set(keyword, entries.length);
        });
        return Array.from(conceptCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    }

    getMemoryDistribution() {
        const types = new Map();
        this.memories.forEach(memory => {
            const type = memory.type || 'unknown';
            types.set(type, (types.get(type) || 0) + 1);
        });
        return Object.fromEntries(types);
    }

    calculateConnectionDensity() {
        const totalNodes = this.knowledgeGraph.size;
        const totalConnections = Array.from(this.knowledgeGraph.values())
            .reduce((sum, node) => sum + node.connections.length, 0);
        return totalNodes > 0 ? totalConnections / totalNodes : 0;
    }

    getRecentActivity() {
        const recent = Array.from(this.memories.values())
            .sort((a, b) => new Date(b.created) - new Date(a.created))
            .slice(0, 5);
        return recent.map(m => ({ id: m.id, title: m.title, created: m.created }));
    }
}

if (require.main === module) {
    const server = new OpenMemoryMCPServer();
    server.start();
}

module.exports = OpenMemoryMCPServer;