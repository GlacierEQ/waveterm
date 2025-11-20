// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Aspen Grove Configuration for Wave Terminal
 * Integrates the full ecosystem of development tools and APIs
 */

export interface AspenGroveConfig {
    ai: AIProviderConfig;
    project: ProjectManagementConfig;
    memory: MemorySystemConfig;
    infrastructure: InfrastructureConfig;
    collaboration: CollaborationConfig;
}

export interface AIProviderConfig {
    providers: {
        openai: string;
        anthropic: string;
        gemini: string;
        deepseek: string;
        perplexity: string;
        groq: string;
        openrouter: string;
        cohere: string;
        together: string;
    };
    defaultProvider: string;
    fallbackProviders: string[];
    multiProviderMode: boolean;
    contextWindow: number;
    streaming: boolean;
}

export interface ProjectManagementConfig {
    platforms: {
        github: string;
        jira: string;
        asana: string;
        taskade: string;
        clickup: string;
        notion: string;
        confluence: string;
    };
    syncInterval: number;
    autoSync: boolean;
    crossPlatformTasks: boolean;
}

export interface MemorySystemConfig {
    systems: {
        supermemory: string;
        mem0: string;
        pinecone: string;
        memoryPlugin: string;
    };
    primarySystem: string;
    backupSystems: string[];
    syncInterval: number;
    contextRetention: boolean;
    crossSessionMemory: boolean;
    vectorDimensions: number;
}

export interface InfrastructureConfig {
    providers: {
        railway: string;
        render: string;
        supabase: string;
        firebase: string;
        neo4j: string;
    };
    defaultProvider: string;
    autoDeployment: boolean;
    stagingEnvironments: boolean;
}

export interface CollaborationConfig {
    platforms: {
        slack: string;
        discord: string;
    };
    autoNotifications: boolean;
    crossPlatformSync: boolean;
    statusUpdates: boolean;
}

// Default configuration
export const DEFAULT_ASPEN_GROVE_CONFIG: AspenGroveConfig = {
    ai: {
        providers: {
            openai: process.env.OPENAI_API_KEY || '',
            anthropic: process.env.ANTHROPIC_API_KEY || '',
            gemini: process.env.GEMINI_API_KEY || '',
            deepseek: process.env.DEEPSEEK_API_KEY || '',
            perplexity: process.env.PERPLEXITY_API_KEY || '',
            groq: process.env.GROQ_API_KEY || '',
            openrouter: process.env.OPENROUTER_API_KEY || '',
            cohere: process.env.COHERE_API_KEY || '',
            together: process.env.TOGETHER_AI_API_KEY || ''
        },
        defaultProvider: 'openai',
        fallbackProviders: ['anthropic', 'deepseek', 'groq'],
        multiProviderMode: true,
        contextWindow: 128000,
        streaming: true
    },
    
    project: {
        platforms: {
            github: process.env.GITHUB_TOKEN || '',
            jira: process.env.JIRA_API_KEY || '',
            asana: process.env.ASANA_TOKEN || '',
            taskade: process.env.TASKADE_API_KEY || '',
            clickup: process.env.CLICKUP_API_KEY || '',
            notion: process.env.NOTION_API_KEY || '',
            confluence: process.env.CONFLUENCE_API_KEY || ''
        },
        syncInterval: 300000, // 5 minutes
        autoSync: true,
        crossPlatformTasks: true
    },
    
    memory: {
        systems: {
            supermemory: process.env.SUPERMEMORY_API_KEY || '',
            mem0: process.env.MEM0_API_KEY || '',
            pinecone: process.env.PINECONE_API_KEY || '',
            memoryPlugin: process.env.MEMORY_PLUGIN_SPECIALIZED || ''
        },
        primarySystem: 'supermemory',
        backupSystems: ['mem0', 'pinecone'],
        syncInterval: 300000, // 5 minutes
        contextRetention: true,
        crossSessionMemory: true,
        vectorDimensions: 1536
    },
    
    infrastructure: {
        providers: {
            railway: process.env.RAILWAY_API_KEY || '',
            render: process.env.RENDER_API_KEY || '',
            supabase: process.env.SUPABASE_API_KEY || '',
            firebase: process.env.FIREBASE_API_KEY || '',
            neo4j: process.env.NEO4J_API_KEY || ''
        },
        defaultProvider: 'railway',
        autoDeployment: false,
        stagingEnvironments: true
    },
    
    collaboration: {
        platforms: {
            slack: process.env.SLACK_TOKEN || '',
            discord: process.env.DISCORD_TOKEN || ''
        },
        autoNotifications: true,
        crossPlatformSync: true,
        statusUpdates: true
    }
};

// Wave Terminal specific enhancements
export const WAVE_TERMINAL_ENHANCEMENTS = {
    // AI Panel Enhancements
    aiPanel: {
        multiProviderSupport: true,
        providerSwitching: true,
        responseComparison: true,
        memoryIntegration: true,
        contextAwareness: true,
        streamingResponses: true
    },
    
    // Terminal Block Enhancements
    terminalBlocks: {
        aiCommandSuggestions: true,
        errorAnalysis: true,
        performanceMonitoring: true,
        memoryPersistence: true,
        collaborativeDebugging: true,
        crossSessionHistory: true
    },
    
    // Workspace Integration
    workspace: {
        projectSync: true,
        taskIntegration: true,
        memorySharing: true,
        aiWorkflows: true,
        collaborativeFeatures: true,
        crossPlatformSync: true
    },
    
    // MCP Server Integration
    mcpServers: {
        aspenGroveOrchestrator: true,
        enhancedFilesystem: true,
        projectSync: true,
        memoryOrchestrator: true,
        aiMultiProvider: true,
        infrastructureManager: true
    }
};

// Utility functions
export function getActiveAIProviders(): string[] {
    return Object.entries(DEFAULT_ASPEN_GROVE_CONFIG.ai.providers)
        .filter(([_, key]) => key && key.length > 0)
        .map(([provider, _]) => provider);
}

export function getActiveProjectPlatforms(): string[] {
    return Object.entries(DEFAULT_ASPEN_GROVE_CONFIG.project.platforms)
        .filter(([_, key]) => key && key.length > 0)
        .map(([platform, _]) => platform);
}

export function getActiveMemorySystems(): string[] {
    return Object.entries(DEFAULT_ASPEN_GROVE_CONFIG.memory.systems)
        .filter(([_, key]) => key && key.length > 0)
        .map(([system, _]) => system);
}

export function getActiveInfraProviders(): string[] {
    return Object.entries(DEFAULT_ASPEN_GROVE_CONFIG.infrastructure.providers)
        .filter(([_, key]) => key && key.length > 0)
        .map(([provider, _]) => provider);
}

// Configuration validation
export function validateAspenGroveConfig(config: Partial<AspenGroveConfig>): boolean {
    // Basic validation - ensure at least one AI provider is configured
    const aiProviders = getActiveAIProviders();
    if (aiProviders.length === 0) {
        console.warn('No AI providers configured');
        return false;
    }
    
    // Ensure memory systems are configured
    const memorySystems = getActiveMemorySystems();
    if (memorySystems.length === 0) {
        console.warn('No memory systems configured');
        return false;
    }
    
    return true;
}

export default DEFAULT_ASPEN_GROVE_CONFIG;