// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Input,
    Button,
    Tooltip,
    Dropdown,
    Space,
    Tag,
    Alert
} from "antd";
import {
    SendOutlined,
    RobotOutlined,
    InfoCircleOutlined,
    SecurityScanOutlined,
    ThunderboltOutlined,
    DatabaseOutlined,
    CloseOutlined,
    BulbOutlined,
    WarningOutlined
} from "@ant-design/icons";
import { SuggestionsOverlay } from "./suggestions-overlay";
import { CommandExplanationComponent } from "./command-explanation";
import { ContextVisualizer } from "./context-visualizer";
import { AISettings } from "./ai-settings";
import { SecurityMonitor } from "./security-monitor";
import { AIAgent, AgentContext, CommandSuggestion, CommandExplanation } from "./aitypes";
import { agentCoordinator } from "./agent-coordinator";
import * as jotai from "jotai";

interface EnhancedTerminalInputProps {
    onCommand: (command: string) => void;
    workingDirectory: string;
    shellType: string;
    recentCommands: string[];
    environmentVariables: Record<string, string>;
    placeholder?: string;
}

export const EnhancedTerminalInput: React.FC<EnhancedTerminalInputProps> = ({
    onCommand,
    workingDirectory,
    shellType,
    recentCommands,
    environmentVariables,
    placeholder = "Type a command or ask for help..."
}) => {
    const [command, setCommand] = useState("");
    const [suggestionsVisible, setSuggestionsVisible] = useState(false);
    const [explanationVisible, setExplanationVisible] = useState(false);
    const [contextVisible, setContextVisible] = useState(false);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [securityVisible, setSecurityVisible] = useState(false);
    const [currentSuggestion, setCurrentSuggestion] = useState<CommandSuggestion | null>(null);
    const [currentExplanation, setCurrentExplanation] = useState<CommandExplanation | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    const inputRef = useRef<any>(null);

    // Input validation utilities
    const validateCommand = (cmd: string): { isValid: boolean; error?: string } => {
        // Check length
        if (cmd.length > 1000) {
            return { isValid: false, error: 'Command too long' };
        }

        // Check allowed characters
        if (!/^[a-zA-Z0-9\s\-_.\/~:]+$/.test(cmd)) {
            return { isValid: false, error: 'Command contains invalid characters' };
        }

        // Check for blocked commands
        const cmdLower = cmd.toLowerCase();
        const blockedCommands = ['rm -rf /', 'sudo rm -rf /*', 'dd if=/dev/zero', 'mkfs', 'fdisk'];
        for (const blocked of blockedCommands) {
            if (cmdLower.includes(blocked)) {
                return { isValid: false, error: 'Blocked command detected' };
            }
        }

        return { isValid: true };
    };

    const sanitizeInput = (input: string): string => {
        return input.replace(/[\x00-\x1F\x7F]/g, '').trim();
    };

    // Load agents on component mount
    useEffect(() => {
        const allAgents = agentCoordinator.getAllAgents();
        setAgents(allAgents);
    }, []);

    // Handle command input changes
    const handleCommandChange = useCallback((value: string) => {
        const sanitizedValue = sanitizeInput(value);
        setCommand(sanitizedValue);

        // Validate input and show error if invalid
        if (sanitizedValue.trim()) {
            const validation = validateCommand(sanitizedValue);
            setValidationError(validation.isValid ? null : validation.error || null);
        } else {
            setValidationError(null);
        }

        // Show suggestions if AI is enabled and command is not empty
        if (aiEnabled && sanitizedValue.trim() && !suggestionsVisible) {
            setSuggestionsVisible(true);
        } else if (!sanitizedValue.trim()) {
            setSuggestionsVisible(false);
        }
    }, [aiEnabled, suggestionsVisible]);

    // Handle suggestion selection
    const handleSuggestionSelect = useCallback((suggestion: string) => {
        const sanitizedSuggestion = sanitizeInput(suggestion);
        setCommand(sanitizedSuggestion);

        // Validate the suggestion
        const validation = validateCommand(sanitizedSuggestion);
        setValidationError(validation.isValid ? null : validation.error || null);

        setSuggestionsVisible(false);
        inputRef.current?.focus();
    }, []);

    // Handle command submission
    const handleSubmit = useCallback(async () => {
        if (!command.trim()) return;

        // Validate command before execution
        const validation = validateCommand(command);
        if (!validation.isValid) {
            setValidationError(validation.error || 'Invalid command');
            return;
        }

        setLoading(true);
        setValidationError(null);

        try {
            // Send command to terminal
            await onCommand(command);

            // Update context with new command
            await agentCoordinator.updateContext({
                ...currentContext,
                recentCommands: [...recentCommands, command]
            });

            // Clear command input
            setCommand("");

        } catch (error) {
            console.error("Error executing command:", error);
        } finally {
            setLoading(false);
        }
    }, [command, onCommand, recentCommands, currentContext]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+/ for command explanation
            if (e.key === "/" && e.ctrlKey && command.trim()) {
                e.preventDefault();
                handleExplainCommand();
            }

            // Ctrl+Space for AI suggestions
            if (e.key === " " && e.ctrlKey) {
                e.preventDefault();
                if (!suggestionsVisible && command.trim()) {
                    setSuggestionsVisible(true);
                }
            }

            // Ctrl+. for context visualizer
            if (e.key === "." && e.ctrlKey) {
                e.preventDefault();
                setContextVisible(true);
            }

            // Ctrl+, for AI settings
            if (e.key === "," && e.ctrlKey) {
                e.preventDefault();
                setSettingsVisible(true);
            }

            // Ctrl+; for security monitor
            if (e.key === ";" && e.ctrlKey) {
                e.preventDefault();
                setSecurityVisible(true);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [command, suggestionsVisible]);

    // Explain current command
    const handleExplainCommand = async () => {
        if (!command.trim()) return;

        setLoading(true);
        try {
            await agentCoordinator.requestCommandExplanation(command, currentContext);
            // In a real implementation, this would show the explanation
            setExplanationVisible(true);
        } catch (error) {
            console.error("Error explaining command:", error);
        } finally {
            setLoading(false);
        }
    };

    // AI action menu items
    const aiMenuItems = [
        {
            key: "explain",
            icon: <InfoCircleOutlined />,
            label: "Explain Command (Ctrl+/)",
            onClick: handleExplainCommand
        },
        {
            key: "context",
            icon: <DatabaseOutlined />,
            label: "View Context (Ctrl+.)",
            onClick: () => setContextVisible(true)
        },
        {
            key: "settings",
            icon: <RobotOutlined />,
            label: "AI Settings (Ctrl+,)",
            onClick: () => setSettingsVisible(true)
        },
        {
            key: "security",
            icon: <SecurityScanOutlined />,
            label: "Security Monitor (Ctrl+;)",
            onClick: () => setSecurityVisible(true)
        }
    ];

    return (
        <div className="enhanced-terminal-input">
            {/* AI Status Bar */}
            <div className="ai-status-bar">
                <div className="status-left">
                    <Space size="small">
                        <Tag color={aiEnabled ? "green" : "default"}>
                            <RobotOutlined />
                            AI {aiEnabled ? "Active" : "Disabled"}
                        </Tag>
                        <Tag color="blue">
                            <ThunderboltOutlined />
                            {agents.filter(a => a.status === "active").length} Agents
                        </Tag>
                    </Space>
                </div>

                <div className="status-right">
                    <Space size="small">
                        <Tooltip title="AI-powered command assistance and explanations">
                            <Button
                                type="text"
                                icon={<BulbOutlined />}
                                size="small"
                                onClick={() => setAiEnabled(!aiEnabled)}
                            />
                        </Tooltip>
                        <Dropdown
                            menu={{
                                items: aiMenuItems,
                                onClick: ({ key }) => {
                                    const item = aiMenuItems.find(i => i.key === key);
                                    if (item?.onClick) item.onClick();
                                }
                            }}
                            trigger={["click"]}
                        >
                            <Button type="text" icon={<RobotOutlined />} size="small" />
                        </Dropdown>
                    </Space>
                </div>
            </div>

            {/* Command Input */}
            <div className="command-input-container">
                <Input
                    ref={inputRef}
                    value={command}
                    onChange={(e) => handleCommandChange(e.target.value)}
                    onPressEnter={handleSubmit}
                    placeholder={placeholder}
                    size="large"
                    className="terminal-command-input"
                    suffix={
                        <Space>
                            <Tooltip title="Explain this command (Ctrl+/)">
                                <Button
                                    type="text"
                                    icon={<InfoCircleOutlined />}
                                    size="small"
                                    onClick={handleExplainCommand}
                                    disabled={!command.trim() || loading}
                                />
                            </Tooltip>
                            <Tooltip title="Execute command">
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    size="small"
                                    onClick={handleSubmit}
                                    loading={loading}
                                />
                            </Tooltip>
                        </Space>
                    }
                />

                {/* Current command analysis */}
                {command.trim() && (
                    <div className="command-analysis">
                        {validationError ? (
                            <Alert
                                message="Command Validation Error"
                                description={validationError}
                                type="error"
                                showIcon
                                closable
                                onClose={() => setValidationError(null)}
                            />
                        ) : (
                            <Alert
                                message="Command Analysis"
                                description={
                                    <div className="analysis-details">
                                        <Tag>Command: {command}</Tag>
                                        <Tag>Directory: {workingDirectory}</Tag>
                                        <Tag>Shell: {shellType}</Tag>
                                    </div>
                                }
                                type="info"
                                showIcon
                                closable
                            />
                        )}
                    </div>
                )}
            </div>

            {/* AI Suggestions Overlay */}
            <SuggestionsOverlay
                isVisible={suggestionsVisible}
                command={command}
                cursorPosition={command.length}
                context={currentContext}
                onSuggestionSelect={handleSuggestionSelect}
                onClose={() => setSuggestionsVisible(false)}
            />

            {/* Command Explanation Modal */}
            <CommandExplanationComponent
                explanation={currentExplanation}
                loading={loading}
                error={null}
                onClose={() => setExplanationVisible(false)}
            />

            {/* Context Visualizer Modal */}
            <ContextVisualizer
                isVisible={contextVisible}
                onClose={() => setContextVisible(false)}
            />

            {/* AI Settings Modal */}
            <AISettings
                visible={settingsVisible}
                onClose={() => setSettingsVisible(false)}
                agents={agents}
            />

            {/* Security Monitor Modal */}
            <SecurityMonitor
                visible={securityVisible}
                onClose={() => setSecurityVisible(false)}
            />

            {/* Keyboard shortcuts help */}
            <div className="shortcuts-help">
                <Text type="secondary" style={{ fontSize: '11px' }}>
                    Ctrl+/ Explain • Ctrl+Space Suggestions • Ctrl+. Context • Ctrl+, Settings • Ctrl+; Security
                </Text>
            </div>
        </div>
    );
};

export default EnhancedTerminalInput;
