// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect } from "react";
import { Button } from "@/app/element/button";
import { Input } from "@/app/element/input";

interface Memory {
    id: string;
    content: string;
    type: string;
    importance: number;
    created: string;
    layer?: string;
    coherence?: number;
}

interface MemoryPluginProps {
    onMemoryStore?: (memory: Memory) => void;
    onMemoryRecall?: (query: string) => Promise<Memory[]>;
}

export const MemoryPlugin: React.FC<MemoryPluginProps> = ({
    onMemoryStore,
    onMemoryRecall
}) => {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [query, setQuery] = useState("");
    const [newMemory, setNewMemory] = useState("");
    const [memoryType, setMemoryType] = useState("semantic");
    const [importance, setImportance] = useState(0.5);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"store" | "recall" | "insights">("store");

    const storeMemory = async () => {
        if (!newMemory.trim()) return;

        const memory: Memory = {
            id: `mem-${Date.now()}`,
            content: newMemory,
            type: memoryType,
            importance,
            created: new Date().toISOString()
        };

        try {
            setIsLoading(true);
            
            // Store in basic memory MCP
            await fetch('http://localhost:13000/memories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memory)
            });

            // Store in OpenMemory MCP
            await fetch('http://localhost:13007/memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memory)
            });

            // Store in SuperMemory MCP
            await fetch('http://localhost:13008/quantum-store', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memory)
            });

            onMemoryStore?.(memory);
            setNewMemory("");
            loadMemories();
        } catch (error) {
            console.error('Error storing memory:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const recallMemories = async () => {
        if (!query.trim()) return;

        try {
            setIsLoading(true);
            
            // Try SuperMemory quantum recall first
            const quantumResponse = await fetch('http://localhost:13008/quantum-recall', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, coherence: 0.3 })
            });

            if (quantumResponse.ok) {
                const data = await quantumResponse.json();
                const results = data.results.map((r: any) => r.memory);
                setMemories(results);
                return;
            }

            // Fallback to OpenMemory semantic search
            const semanticResponse = await fetch('http://localhost:13007/semantic-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, limit: 10 })
            });

            if (semanticResponse.ok) {
                const data = await semanticResponse.json();
                const results = data.results.map((r: any) => r.memory);
                setMemories(results);
                return;
            }

            // Final fallback to basic memory search
            const basicResponse = await fetch('http://localhost:13000/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (basicResponse.ok) {
                const data = await basicResponse.json();
                setMemories(data.results);
            }

        } catch (error) {
            console.error('Error recalling memories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMemories = async () => {
        try {
            const response = await fetch('http://localhost:13000/memories');
            if (response.ok) {
                const data = await response.json();
                setMemories(data.slice(0, 10));
            }
        } catch (error) {
            console.error('Error loading memories:', error);
        }
    };

    useEffect(() => {
        loadMemories();
    }, []);

    return (
        <div className="memory-plugin p-4 bg-gray-50 rounded-lg">
            <div className="flex space-x-2 mb-4">
                <Button
                    variant={activeTab === "store" ? "primary" : "secondary"}
                    onClick={() => setActiveTab("store")}
                >
                    Store
                </Button>
                <Button
                    variant={activeTab === "recall" ? "primary" : "secondary"}
                    onClick={() => setActiveTab("recall")}
                >
                    Recall
                </Button>
                <Button
                    variant={activeTab === "insights" ? "primary" : "secondary"}
                    onClick={() => setActiveTab("insights")}
                >
                    Insights
                </Button>
            </div>

            {activeTab === "store" && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Memory Content</label>
                        <textarea
                            value={newMemory}
                            onChange={(e) => setNewMemory(e.target.value)}
                            placeholder="Enter memory content..."
                            className="w-full p-2 border rounded-md h-24 resize-none"
                        />
                    </div>

                    <div className="flex space-x-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2">Type</label>
                            <select
                                value={memoryType}
                                onChange={(e) => setMemoryType(e.target.value)}
                                className="w-full p-2 border rounded-md"
                            >
                                <option value="semantic">Semantic</option>
                                <option value="episodic">Episodic</option>
                                <option value="procedural">Procedural</option>
                                <option value="working">Working</option>
                            </select>
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2">
                                Importance: {importance.toFixed(1)}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={importance}
                                onChange={(e) => setImportance(parseFloat(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={storeMemory}
                        disabled={isLoading || !newMemory.trim()}
                        className="w-full"
                    >
                        {isLoading ? "Storing..." : "Store Memory"}
                    </Button>
                </div>
            )}

            {activeTab === "recall" && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Search Query</label>
                        <div className="flex space-x-2">
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Enter search query..."
                                onKeyPress={(e) => e.key === 'Enter' && recallMemories()}
                            />
                            <Button
                                onClick={recallMemories}
                                disabled={isLoading || !query.trim()}
                            >
                                {isLoading ? "Searching..." : "Recall"}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {memories.map((memory) => (
                            <div key={memory.id} className="p-3 bg-white rounded border">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-gray-500">
                                        {memory.type} • {new Date(memory.created).toLocaleDateString()}
                                    </span>
                                    {memory.coherence && (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            Coherence: {(memory.coherence * 100).toFixed(0)}%
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm">{memory.content}</p>
                                {memory.layer && (
                                    <div className="mt-2">
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                            {memory.layer}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                        {memories.length === 0 && !isLoading && (
                            <p className="text-gray-500 text-center py-4">No memories found</p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "insights" && (
                <MemoryInsights />
            )}
        </div>
    );
};

const MemoryInsights: React.FC = () => {
    const [insights, setInsights] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadInsights = async () => {
        setIsLoading(true);
        try {
            // Get SuperMemory AI insights
            const superResponse = await fetch('http://localhost:13008/ai-insights');
            if (superResponse.ok) {
                const superInsights = await superResponse.json();
                
                // Get OpenMemory insights
                const openResponse = await fetch('http://localhost:13007/insights');
                const openInsights = openResponse.ok ? await openResponse.json() : {};

                setInsights({
                    super: superInsights,
                    open: openInsights
                });
            }
        } catch (error) {
            console.error('Error loading insights:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadInsights();
    }, []);

    if (isLoading) {
        return <div className="text-center py-4">Loading insights...</div>;
    }

    if (!insights) {
        return <div className="text-center py-4">No insights available</div>;
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border">
                    <h4 className="font-medium mb-2">Memory Efficiency</h4>
                    <div className="text-2xl font-bold text-blue-600">
                        {(insights.super?.memoryEfficiency * 100 || 0).toFixed(0)}%
                    </div>
                </div>

                <div className="bg-white p-3 rounded border">
                    <h4 className="font-medium mb-2">Quantum Coherence</h4>
                    <div className="text-2xl font-bold text-purple-600">
                        {(insights.super?.quantumCoherence * 100 || 0).toFixed(0)}%
                    </div>
                </div>

                <div className="bg-white p-3 rounded border">
                    <h4 className="font-medium mb-2">Total Memories</h4>
                    <div className="text-2xl font-bold text-green-600">
                        {insights.open?.totalMemories || 0}
                    </div>
                </div>

                <div className="bg-white p-3 rounded border">
                    <h4 className="font-medium mb-2">Knowledge Nodes</h4>
                    <div className="text-2xl font-bold text-orange-600">
                        {insights.open?.knowledgeNodes || 0}
                    </div>
                </div>
            </div>

            {insights.super?.layerOptimization && (
                <div className="bg-white p-3 rounded border">
                    <h4 className="font-medium mb-2">Memory Layers</h4>
                    <div className="space-y-2">
                        {Object.entries(insights.super.layerOptimization).map(([layer, stats]: [string, any]) => (
                            <div key={layer} className="flex justify-between items-center">
                                <span className="capitalize">{layer}</span>
                                <div className="flex space-x-2">
                                    <span className="text-sm text-gray-600">
                                        {(stats.utilization * 100).toFixed(0)}% used
                                    </span>
                                    <span className="text-sm text-green-600">
                                        {(stats.efficiency * 100).toFixed(0)}% efficient
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {insights.super?.recommendedOptimizations && (
                <div className="bg-white p-3 rounded border">
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                        {insights.super.recommendedOptimizations.map((rec: string, index: number) => (
                            <li key={index} className="text-sm text-gray-700">• {rec}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};