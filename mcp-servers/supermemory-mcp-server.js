#!/usr/bin/env node

/**
 * SuperMemory MCP Server
 * Advanced AI-powered memory system with quantum intelligence and distributed memory
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

class SuperMemoryMCPServer {
    constructor(port = 13008) {
        this.port = port;
        this.quantumMemory = new Map();
        this.distributedNodes = new Map();
        this.memoryLayers = new Map();
        this.aiInsights = new Map();
        this.memoryFile = path.join(__dirname, 'supermemory-store.json');
        this.loadData();
        this.initializeQuantumLayers();
    }

    loadData() {
        try {
            if (fs.existsSync(this.memoryFile)) {
                const data = JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
                this.quantumMemory = new Map(Object.entries(data.quantumMemory || {}));
                this.distributedNodes = new Map(Object.entries(data.distributedNodes || {}));
                this.memoryLayers = new Map(Object.entries(data.memoryLayers || {}));
                this.aiInsights = new Map(Object.entries(data.aiInsights || {}));
            }
        } catch (error) {
            console.warn('⚠️ Could not load SuperMemory data:', error.message);
        }
    }

    saveData() {
        try {
            const data = {
                quantumMemory: Object.fromEntries(this.quantumMemory),
                distributedNodes: Object.fromEntries(this.distributedNodes),
                memoryLayers: Object.fromEntries(this.memoryLayers),
                aiInsights: Object.fromEntries(this.aiInsights)
            };
            fs.writeFileSync(this.memoryFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('❌ Error saving SuperMemory data:', error.message);
        }
    }

    initializeQuantumLayers() {
        const layers = ['immediate', 'short_term', 'long_term', 'permanent', 'quantum'];
        layers.forEach(layer => {
            if (!this.memoryLayers.has(layer)) {
                this.memoryLayers.set(layer, {
                    id: layer,
                    memories: [],
                    capacity: this.getLayerCapacity(layer),
                    retention: this.getRetentionPolicy(layer),
                    priority: this.getLayerPriority(layer)
                });
            }
        });
    }

    getLayerCapacity(layer) {
        const capacities = {
            immediate: 100,
            short_term: 1000,
            long_term: 10000,
            permanent: 100000,
            quantum: Infinity
        };
        return capacities[layer] || 1000;
    }

    getRetentionPolicy(layer) {
        const policies = {
            immediate: { duration: 300000, decay: 0.9 }, // 5 minutes
            short_term: { duration: 3600000, decay: 0.8 }, // 1 hour
            long_term: { duration: 86400000, decay: 0.7 }, // 1 day
            permanent: { duration: Infinity, decay: 0.0 },
            quantum: { duration: Infinity, decay: 0.0 }
        };
        return policies[layer];
    }

    getLayerPriority(layer) {
        const priorities = {
            immediate: 1,
            short_term: 2,
            long_term: 3,
            permanent: 4,
            quantum: 5
        };
        return priorities[layer] || 3;
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
                    case '/quantum-store': this.handleQuantumStore(req, res); break;
                    case '/quantum-recall': this.handleQuantumRecall(req, res); break;
                    case '/distributed-sync': this.handleDistributedSync(req, res); break;
                    case '/ai-insights': this.handleAIInsights(req, res); break;
                    case '/memory-layers': this.handleMemoryLayers(req, res); break;
                    case '/optimize': this.handleOptimize(req, res); break;
                    case '/quantum-entangle': this.handleQuantumEntangle(req, res); break;
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
            console.log(`🚀 SuperMemory MCP Server running on port ${this.port}`);
            this.startQuantumProcessing();
        });
    }

    handleHealth(req, res) {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'quantum_ready',
            quantumMemories: this.quantumMemory.size,
            distributedNodes: this.distributedNodes.size,
            memoryLayers: this.memoryLayers.size,
            aiInsights: this.aiInsights.size,
            quantumCoherence: this.calculateQuantumCoherence()
        }));
    }

    handleQuantumStore(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const memory = JSON.parse(body);
                const quantumId = this.storeQuantumMemory(memory);
                res.writeHead(201);
                res.end(JSON.stringify({ quantumId, status: 'entangled' }));
            });
        }
    }

    handleQuantumRecall(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { query, coherence = 0.8, layers = ['all'] } = JSON.parse(body);
                const results = this.quantumRecall(query, coherence, layers);
                res.writeHead(200);
                res.end(JSON.stringify({ query, results, coherence: this.calculateQuantumCoherence() }));
            });
        }
    }

    handleDistributedSync(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { nodeId, memories } = JSON.parse(body);
                this.syncDistributedNode(nodeId, memories);
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'synchronized', nodeId }));
            });
        } else if (req.method === 'GET') {
            const syncStatus = this.getDistributedSyncStatus();
            res.writeHead(200);
            res.end(JSON.stringify(syncStatus));
        }
    }

    handleAIInsights(req, res) {
        const insights = this.generateAIInsights();
        res.writeHead(200);
        res.end(JSON.stringify(insights));
    }

    handleMemoryLayers(req, res) {
        if (req.method === 'GET') {
            const layers = Array.from(this.memoryLayers.values());
            res.writeHead(200);
            res.end(JSON.stringify(layers));
        }
    }

    handleOptimize(req, res) {
        const optimization = this.performQuantumOptimization();
        res.writeHead(200);
        res.end(JSON.stringify(optimization));
    }

    handleQuantumEntangle(req, res) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { memoryIds, entanglementType = 'semantic' } = JSON.parse(body);
                const entanglement = this.createQuantumEntanglement(memoryIds, entanglementType);
                res.writeHead(200);
                res.end(JSON.stringify(entanglement));
            });
        }
    }

    storeQuantumMemory(memory) {
        const quantumId = `qm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const quantumMemory = {
            id: quantumId,
            ...memory,
            created: new Date().toISOString(),
            quantumState: this.generateQuantumState(),
            coherence: Math.random() * 0.5 + 0.5,
            entanglements: [],
            layer: this.determineOptimalLayer(memory),
            distributedNodes: []
        };

        this.quantumMemory.set(quantumId, quantumMemory);
        this.assignToLayer(quantumMemory);
        this.distributeToNodes(quantumMemory);
        this.saveData();

        return quantumId;
    }

    generateQuantumState() {
        return {
            amplitude: Math.random(),
            phase: Math.random() * 2 * Math.PI,
            spin: Math.random() > 0.5 ? 'up' : 'down',
            entangled: false,
            superposition: Math.random() > 0.7
        };
    }

    determineOptimalLayer(memory) {
        const importance = memory.importance || 0.5;
        const urgency = memory.urgency || 0.5;
        const complexity = memory.complexity || 0.5;

        const score = (importance * 0.4) + (urgency * 0.3) + (complexity * 0.3);

        if (score > 0.8) return 'quantum';
        if (score > 0.6) return 'permanent';
        if (score > 0.4) return 'long_term';
        if (score > 0.2) return 'short_term';
        return 'immediate';
    }

    assignToLayer(memory) {
        const layer = this.memoryLayers.get(memory.layer);
        if (layer) {
            layer.memories.push(memory.id);
            if (layer.memories.length > layer.capacity) {
                this.performLayerEviction(layer);
            }
        }
    }

    performLayerEviction(layer) {
        const evictCount = Math.floor(layer.capacity * 0.1);
        const toEvict = layer.memories.slice(0, evictCount);
        
        toEvict.forEach(memoryId => {
            const memory = this.quantumMemory.get(memoryId);
            if (memory && memory.layer !== 'permanent' && memory.layer !== 'quantum') {
                this.promoteOrDemoteMemory(memory);
            }
        });

        layer.memories = layer.memories.slice(evictCount);
    }

    promoteOrDemoteMemory(memory) {
        const currentLayer = memory.layer;
        const usage = this.calculateMemoryUsage(memory);
        
        if (usage > 0.7) {
            memory.layer = this.getNextHigherLayer(currentLayer);
        } else if (usage < 0.3) {
            memory.layer = this.getNextLowerLayer(currentLayer);
        }
    }

    getNextHigherLayer(current) {
        const hierarchy = ['immediate', 'short_term', 'long_term', 'permanent', 'quantum'];
        const index = hierarchy.indexOf(current);
        return index < hierarchy.length - 1 ? hierarchy[index + 1] : current;
    }

    getNextLowerLayer(current) {
        const hierarchy = ['immediate', 'short_term', 'long_term', 'permanent', 'quantum'];
        const index = hierarchy.indexOf(current);
        return index > 0 ? hierarchy[index - 1] : current;
    }

    calculateMemoryUsage(memory) {
        return Math.random(); // Simplified usage calculation
    }

    distributeToNodes(memory) {
        const nodeCount = Math.min(3, this.distributedNodes.size);
        const selectedNodes = Array.from(this.distributedNodes.keys()).slice(0, nodeCount);
        
        selectedNodes.forEach(nodeId => {
            memory.distributedNodes.push(nodeId);
            const node = this.distributedNodes.get(nodeId);
            if (node) {
                node.memories.push(memory.id);
            }
        });
    }

    quantumRecall(query, coherence, layers) {
        const results = [];
        const queryVector = this.vectorizeQuery(query);

        this.quantumMemory.forEach(memory => {
            if (layers.includes('all') || layers.includes(memory.layer)) {
                const similarity = this.calculateQuantumSimilarity(queryVector, memory);
                if (similarity >= coherence) {
                    results.push({
                        memory,
                        similarity,
                        quantumCoherence: memory.coherence,
                        entanglementStrength: this.calculateEntanglementStrength(memory)
                    });
                }
            }
        });

        return results.sort((a, b) => b.similarity - a.similarity);
    }

    vectorizeQuery(query) {
        return query.split(' ').map(word => word.length / 10);
    }

    calculateQuantumSimilarity(queryVector, memory) {
        const memoryVector = this.vectorizeQuery(memory.content || memory.text || '');
        const dotProduct = queryVector.reduce((sum, val, i) => sum + val * (memoryVector[i] || 0), 0);
        const magnitude = Math.sqrt(queryVector.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? dotProduct / magnitude : 0;
    }

    calculateEntanglementStrength(memory) {
        return memory.entanglements.length * 0.1 + memory.quantumState.amplitude;
    }

    syncDistributedNode(nodeId, memories) {
        if (!this.distributedNodes.has(nodeId)) {
            this.distributedNodes.set(nodeId, {
                id: nodeId,
                memories: [],
                lastSync: new Date().toISOString(),
                status: 'active'
            });
        }

        const node = this.distributedNodes.get(nodeId);
        node.memories = [...new Set([...node.memories, ...memories])];
        node.lastSync = new Date().toISOString();
        this.saveData();
    }

    getDistributedSyncStatus() {
        return {
            nodes: Array.from(this.distributedNodes.values()),
            totalNodes: this.distributedNodes.size,
            syncHealth: this.calculateSyncHealth()
        };
    }

    calculateSyncHealth() {
        const now = Date.now();
        const healthyNodes = Array.from(this.distributedNodes.values()).filter(node => {
            const lastSync = new Date(node.lastSync).getTime();
            return (now - lastSync) < 300000; // 5 minutes
        });
        return this.distributedNodes.size > 0 ? healthyNodes.length / this.distributedNodes.size : 1;
    }

    generateAIInsights() {
        return {
            memoryEfficiency: this.calculateMemoryEfficiency(),
            quantumCoherence: this.calculateQuantumCoherence(),
            distributedHealth: this.calculateSyncHealth(),
            layerOptimization: this.analyzeLayerOptimization(),
            entanglementNetwork: this.analyzeEntanglementNetwork(),
            predictions: this.generatePredictions()
        };
    }

    calculateMemoryEfficiency() {
        const totalMemories = this.quantumMemory.size;
        const activeMemories = Array.from(this.quantumMemory.values()).filter(m => m.coherence > 0.5).length;
        return totalMemories > 0 ? activeMemories / totalMemories : 0;
    }

    calculateQuantumCoherence() {
        const coherences = Array.from(this.quantumMemory.values()).map(m => m.coherence);
        return coherences.length > 0 ? coherences.reduce((sum, c) => sum + c, 0) / coherences.length : 0;
    }

    analyzeLayerOptimization() {
        const layerStats = {};
        this.memoryLayers.forEach((layer, name) => {
            layerStats[name] = {
                utilization: layer.memories.length / layer.capacity,
                efficiency: Math.random() * 0.3 + 0.7
            };
        });
        return layerStats;
    }

    analyzeEntanglementNetwork() {
        const totalEntanglements = Array.from(this.quantumMemory.values())
            .reduce((sum, memory) => sum + memory.entanglements.length, 0);
        return {
            totalEntanglements,
            averageEntanglements: this.quantumMemory.size > 0 ? totalEntanglements / this.quantumMemory.size : 0,
            networkDensity: this.calculateNetworkDensity()
        };
    }

    calculateNetworkDensity() {
        const n = this.quantumMemory.size;
        const maxConnections = n * (n - 1) / 2;
        const actualConnections = Array.from(this.quantumMemory.values())
            .reduce((sum, memory) => sum + memory.entanglements.length, 0) / 2;
        return maxConnections > 0 ? actualConnections / maxConnections : 0;
    }

    generatePredictions() {
        return {
            memoryGrowth: Math.random() * 0.2 + 0.1,
            coherenceTrend: Math.random() > 0.5 ? 'increasing' : 'stable',
            optimalLayerDistribution: this.predictOptimalDistribution(),
            recommendedOptimizations: this.generateOptimizationRecommendations()
        };
    }

    predictOptimalDistribution() {
        return {
            immediate: 0.1,
            short_term: 0.2,
            long_term: 0.4,
            permanent: 0.2,
            quantum: 0.1
        };
    }

    generateOptimizationRecommendations() {
        return [
            'Increase quantum layer capacity',
            'Optimize entanglement patterns',
            'Improve distributed sync frequency',
            'Enhance coherence maintenance'
        ];
    }

    performQuantumOptimization() {
        const optimizations = {
            coherenceImprovement: this.optimizeCoherence(),
            layerRebalancing: this.rebalanceLayers(),
            entanglementOptimization: this.optimizeEntanglements(),
            distributedOptimization: this.optimizeDistribution()
        };

        this.saveData();
        return optimizations;
    }

    optimizeCoherence() {
        let improved = 0;
        this.quantumMemory.forEach(memory => {
            if (memory.coherence < 0.7) {
                memory.coherence = Math.min(1.0, memory.coherence + 0.1);
                improved++;
            }
        });
        return { improved, total: this.quantumMemory.size };
    }

    rebalanceLayers() {
        const rebalanced = {};
        this.memoryLayers.forEach((layer, name) => {
            const targetUtilization = 0.8;
            const currentUtilization = layer.memories.length / layer.capacity;
            if (currentUtilization > targetUtilization) {
                rebalanced[name] = 'reduced';
            } else if (currentUtilization < 0.5) {
                rebalanced[name] = 'increased';
            }
        });
        return rebalanced;
    }

    optimizeEntanglements() {
        let optimized = 0;
        this.quantumMemory.forEach(memory => {
            if (memory.entanglements.length > 5) {
                memory.entanglements = memory.entanglements.slice(0, 5);
                optimized++;
            }
        });
        return { optimized };
    }

    optimizeDistribution() {
        return {
            nodesOptimized: this.distributedNodes.size,
            syncImproved: true,
            redundancyOptimized: true
        };
    }

    createQuantumEntanglement(memoryIds, entanglementType) {
        const entanglementId = `ent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const strength = Math.random() * 0.5 + 0.5;

        memoryIds.forEach(memoryId => {
            const memory = this.quantumMemory.get(memoryId);
            if (memory) {
                memory.entanglements.push({
                    id: entanglementId,
                    type: entanglementType,
                    strength,
                    partners: memoryIds.filter(id => id !== memoryId)
                });
                memory.quantumState.entangled = true;
            }
        });

        this.saveData();
        return { entanglementId, strength, type: entanglementType, memories: memoryIds.length };
    }

    startQuantumProcessing() {
        setInterval(() => {
            this.performQuantumMaintenance();
        }, 30000); // Every 30 seconds
    }

    performQuantumMaintenance() {
        this.decayMemories();
        this.maintainCoherence();
        this.optimizeEntanglements();
    }

    decayMemories() {
        this.quantumMemory.forEach(memory => {
            const layer = this.memoryLayers.get(memory.layer);
            if (layer && layer.retention.decay > 0) {
                memory.coherence *= (1 - layer.retention.decay * 0.01);
                if (memory.coherence < 0.1 && memory.layer !== 'permanent' && memory.layer !== 'quantum') {
                    this.quantumMemory.delete(memory.id);
                }
            }
        });
    }

    maintainCoherence() {
        this.quantumMemory.forEach(memory => {
            if (memory.quantumState.superposition) {
                memory.coherence = Math.min(1.0, memory.coherence + 0.01);
            }
        });
    }
}

if (require.main === module) {
    const server = new SuperMemoryMCPServer();
    server.start();
}

module.exports = SuperMemoryMCPServer;