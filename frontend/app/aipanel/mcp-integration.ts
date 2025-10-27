// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { AgentContext, AgentMessage, MessageType } from "./aitypes";

interface MCPTool {
    id: string;
    name: string;
    description: string;
    parameters: Record<string, any>;
    capabilities: string[];
    endpoint?: string;
    status: "connected" | "disconnected" | "error";
}

interface MCPConnection {
    id: string;
    server: string;
    port: number;
    tools: MCPTool[];
    status: "connected" | "disconnected" | "error";
    lastHeartbeat: number;
}

export class MCPIntegrationService {
    private connections: Map<string, MCPConnection> = new Map();
    private tools: Map<string, MCPTool> = new Map();
    private isInitialized: boolean = false;
    private heartbeatInterval: NodeJS.Timeout | null = null;

    // Default MCP servers to connect to
    private defaultServers = [
        {
            id: "memory-mcp",
            server: "localhost",
            port: 3000,
            name: "Memory MCP Server",
            tools: ["memory_management", "context_storage", "ai_memory"]
        },
        {
            id: "filesystem-mcp",
            server: "localhost",
            port: 3001,
            name: "Filesystem MCP Server",
            tools: ["file_operations", "directory_browsing", "file_search"]
        },
        {
            id: "terminal-mcp",
            server: "localhost",
            port: 3002,
            name: "Terminal MCP Server",
            tools: ["command_execution", "process_management", "system_info"]
        },
        {
            id: "kubectl-mcp",
            server: "localhost",
            port: 3003,
            name: "Kubectl MCP Server",
            tools: ["cluster_management", "pod_operations", "deployment_management", "service_operations", "logs", "describe"]
        },
        {
            id: "helm-mcp",
            server: "localhost",
            port: 3004,
            name: "Helm MCP Server",
            tools: ["chart_management", "release_management", "package_operations", "template_generation"]
        },
        {
            id: "minikube-mcp",
            server: "localhost",
            port: 3005,
            name: "Minikube MCP Server",
            tools: ["local_cluster", "development_environment", "service_tunneling", "addon_management"]
        }
    ];

    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        if (this.isInitialized) return;

        console.log("Initializing MCP Integration Service...");

        try {
            // Start heartbeat monitoring
            this.startHeartbeat();

            // Connect to default servers
            await this.connectToDefaultServers();

            this.isInitialized = true;
            console.log("MCP Integration Service initialized successfully");

        } catch (error) {
            console.error("Error initializing MCP service:", error);
        }
    }

    private async connectToDefaultServers(): Promise<void> {
        for (const serverConfig of this.defaultServers) {
            try {
                await this.connectToServer(serverConfig);
            } catch (error) {
                console.warn(`Failed to connect to MCP server ${serverConfig.name}:`, error);
            }
        }
    }

    private async connectToServer(serverConfig: any): Promise<void> {
        const connection: MCPConnection = {
            id: serverConfig.id,
            server: serverConfig.server,
            port: serverConfig.port,
            tools: [],
            status: "disconnected",
            lastHeartbeat: 0
        };

        this.connections.set(connection.id, connection);

        try {
            // Attempt to connect via WebSocket or HTTP
            const tools = await this.discoverTools(connection);
            connection.tools = tools;
            connection.status = "connected";
            connection.lastHeartbeat = Date.now();

            // Register tools
            tools.forEach(tool => {
                this.tools.set(tool.id, tool);
            });

            console.log(`Connected to MCP server ${serverConfig.name} with ${tools.length} tools`);

        } catch (error) {
            connection.status = "error";
            console.error(`Failed to connect to ${serverConfig.name}:`, error);
        }
    }

    private async discoverTools(connection: MCPConnection): Promise<MCPTool[]> {
        // In a real implementation, this would query the MCP server for available tools
        // For now, return mock tools based on server configuration
        const mockTools: MCPTool[] = [];

        for (const toolName of connection.tools) {
            let endpoint = `http://${connection.server}:${connection.port}`;

            // Set appropriate endpoint based on tool type
            switch (toolName) {
                case "memory_management":
                case "context_storage":
                case "ai_memory":
                    endpoint += "/memory";
                    break;
                case "file_operations":
                case "directory_browsing":
                case "file_search":
                    endpoint += "/files";
                    break;
                case "command_execution":
                case "process_management":
                case "system_info":
                    endpoint += "/commands";
                    break;
                case "cluster_management":
                case "pod_operations":
                case "deployment_management":
                case "service_operations":
                case "logs":
                case "describe":
                    endpoint += "/" + toolName.replace("_", "/");
                    break;
                case "chart_management":
                case "release_management":
                case "package_operations":
                case "template_generation":
                    endpoint += "/" + toolName.replace("_", "/");
                    break;
                case "local_cluster":
                case "development_environment":
                case "service_tunneling":
                case "addon_management":
                    endpoint += "/" + toolName.replace("_", "/");
                    break;
                default:
                    endpoint += "/" + toolName;
            }

            mockTools.push({
                id: `${connection.id}_${toolName}`,
                name: toolName,
                description: `MCP tool for ${toolName.replace("_", " ")} operations`,
                parameters: this.getToolParameters(toolName),
                capabilities: [toolName],
                endpoint,
                status: "connected"
            });
        }

        return mockTools;
    }

    private getToolParameters(toolName: string): Record<string, any> {
        // Define parameters for each tool type
        const paramSchemas: Record<string, any> = {
            memory_management: {
                operation: { type: "string", required: true, description: "Memory operation (get, set, delete)" },
                key: { type: "string", required: false, description: "Memory key" },
                value: { type: "any", required: false, description: "Memory value" }
            },
            file_operations: {
                operation: { type: "string", required: true, description: "File operation (read, write, delete)" },
                path: { type: "string", required: true, description: "File path" },
                content: { type: "string", required: false, description: "File content" }
            },
            cluster_management: {
                operation: { type: "string", required: true, description: "Cluster operation (info, status, nodes)" }
            },
            pod_operations: {
                namespace: { type: "string", required: false, description: "Kubernetes namespace", default: "default" },
                operation: { type: "string", required: true, description: "Pod operation (get, create, delete)" }
            },
            deployment_management: {
                namespace: { type: "string", required: false, description: "Kubernetes namespace", default: "default" },
                operation: { type: "string", required: true, description: "Deployment operation" }
            },
            logs: {
                namespace: { type: "string", required: false, description: "Kubernetes namespace", default: "default" },
                pod: { type: "string", required: true, description: "Pod name" },
                container: { type: "string", required: false, description: "Container name" },
                tail: { type: "number", required: false, description: "Number of lines to tail", default: 100 }
            },
            chart_management: {
                operation: { type: "string", required: true, description: "Chart operation (search, install, upgrade)" },
                chart: { type: "string", required: false, description: "Chart name" },
                repo: { type: "string", required: false, description: "Repository name" }
            },
            local_cluster: {
                operation: { type: "string", required: true, description: "Minikube operation (start, stop, status)" },
                driver: { type: "string", required: false, description: "Minikube driver" }
            }
        };

        return paramSchemas[toolName] || {};
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            this.checkConnections();
        }, 5000); // Check every 5 seconds
    }

    private async checkConnections(): Promise<void> {
        for (const [connectionId, connection] of this.connections) {
            if (connection.status === "connected") {
                const timeSinceHeartbeat = Date.now() - connection.lastHeartbeat;

                if (timeSinceHeartbeat > 30000) { // 30 seconds timeout
                    connection.status = "disconnected";
                    console.warn(`MCP connection ${connectionId} timed out`);
                }
            }
        }
    }

    // Public API methods
    async executeTool(toolId: string, parameters: Record<string, any>, context: AgentContext): Promise<any> {
        const tool = this.tools.get(toolId);
        if (!tool) {
            throw new Error(`Tool ${toolId} not found`);
        }

        if (tool.status !== "connected") {
            throw new Error(`Tool ${toolId} is not connected`);
        }

        try {
            // In a real implementation, this would make an HTTP/WebSocket call to the MCP server
            const result = await this.callMCPTool(tool, parameters, context);

            // Update tool usage statistics
            tool.parameters = { ...tool.parameters, lastUsed: Date.now() };

            return result;

        } catch (error) {
            console.error(`Error executing tool ${toolId}:`, error);
            throw error;
        }
    }

    private async callMCPTool(tool: MCPTool, parameters: Record<string, any>, context: AgentContext): Promise<any> {
        // Mock implementation - in reality this would call the MCP server
        console.log(`Executing MCP tool ${tool.name} with parameters:`, parameters);

        // Simulate different tool responses based on tool type
        switch (tool.name) {
            case "memory_management":
                return {
                    type: "memory_operation",
                    operation: parameters.operation,
                    success: true,
                    result: `Memory ${parameters.operation} completed`
                };

            case "file_operations":
                return {
                    type: "file_operation",
                    operation: parameters.operation,
                    path: parameters.path,
                    success: true,
                    result: `File operation ${parameters.operation} completed`
                };

            case "command_execution":
                return {
                    type: "terminal_command",
                    command: parameters.command,
                    output: `Mock terminal output for: ${parameters.command}`,
                    success: true
                };

            case "cluster_management":
                return {
                    type: "kubernetes_cluster",
                    operation: parameters.operation,
                    result: `Kubernetes cluster ${parameters.operation} completed`,
                    success: true
                };

            case "pod_operations":
                return {
                    type: "kubernetes_pods",
                    namespace: parameters.namespace || "default",
                    result: `Pod operations in namespace ${parameters.namespace || "default"}`,
                    success: true
                };

            case "deployment_management":
                return {
                    type: "kubernetes_deployments",
                    namespace: parameters.namespace || "default",
                    result: `Deployment management in namespace ${parameters.namespace || "default"}`,
                    success: true
                };

            case "service_operations":
                return {
                    type: "kubernetes_services",
                    namespace: parameters.namespace || "default",
                    result: `Service operations in namespace ${parameters.namespace || "default"}`,
                    success: true
                };

            case "logs":
                return {
                    type: "kubernetes_logs",
                    namespace: parameters.namespace || "default",
                    pod: parameters.pod,
                    result: `Logs retrieved from ${parameters.pod} in ${parameters.namespace || "default"}`,
                    success: true
                };

            case "chart_management":
                return {
                    type: "helm_charts",
                    operation: parameters.operation,
                    result: `Helm chart ${parameters.operation} completed`,
                    success: true
                };

            case "release_management":
                return {
                    type: "helm_releases",
                    namespace: parameters.namespace || "default",
                    result: `Helm release management in ${parameters.namespace || "default"}`,
                    success: true
                };

            case "local_cluster":
                return {
                    type: "minikube_cluster",
                    operation: parameters.operation,
                    result: `Minikube ${parameters.operation} completed`,
                    success: true
                };

            case "development_environment":
                return {
                    type: "minikube_development",
                    operation: parameters.operation,
                    result: `Minikube development environment ${parameters.operation}`,
                    success: true
                };

            default:
                return {
                    type: "generic_response",
                    tool: tool.name,
                    parameters,
                    result: `Tool ${tool.name} executed successfully`
                };
        }
    }

    async discoverAvailableTools(): Promise<MCPTool[]> {
        const allTools: MCPTool[] = [];

        for (const connection of this.connections.values()) {
            if (connection.status === "connected") {
                allTools.push(...connection.tools);
            }
        }

        return allTools;
    }

    getConnectedTools(): MCPTool[] {
        return Array.from(this.tools.values()).filter(tool => tool.status === "connected");
    }

    getConnectionStatus(): Record<string, string> {
        const status: Record<string, string> = {};

        for (const [id, connection] of this.connections) {
            status[id] = connection.status;
        }

        return status;
    }

    async addCustomServer(serverConfig: { id: string; server: string; port: number; name: string; tools: string[] }): Promise<void> {
        await this.connectToServer(serverConfig);
    }

    async removeServer(serverId: string): Promise<void> {
        const connection = this.connections.get(serverId);
        if (connection) {
            // Disconnect and clean up
            connection.status = "disconnected";
            connection.tools.forEach(tool => {
                this.tools.delete(tool.id);
            });
            this.connections.delete(serverId);
        }
    }

    // Agent integration methods
    async registerAgentWithMCP(agentId: string, capabilities: string[]): Promise<void> {
        // Register agent capabilities with connected MCP servers
        for (const connection of this.connections.values()) {
            if (connection.status === "connected") {
                await this.notifyServerOfAgent(connection, agentId, capabilities);
            }
        }
    }

    private async notifyServerOfAgent(connection: MCPConnection, agentId: string, capabilities: string[]): Promise<void> {
        // Notify MCP server about new agent
        try {
            // This would send a registration message to the MCP server
            console.log(`Registering agent ${agentId} with MCP server ${connection.id}`);
        } catch (error) {
            console.error(`Error registering agent with MCP server ${connection.id}:`, error);
        }
    }

    // Cleanup
    destroy(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        // Disconnect all connections
        for (const connection of this.connections.values()) {
            connection.status = "disconnected";
        }

        this.connections.clear();
        this.tools.clear();
        this.isInitialized = false;
    }
}

// Singleton instance
export const mcpService = new MCPIntegrationService();
