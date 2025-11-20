#!/usr/bin/env node

/**
 * Kubernetes Environment Check Script
 * Checks the status of Kubernetes tools and environment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class KubernetesChecker {
    constructor() {
        this.isMac = process.platform === 'darwin';
        this.isLinux = process.platform === 'linux';
        this.isWindows = process.platform === 'windows';
    }

    executeCommand(command, options = {}) {
        try {
            const output = execSync(command, {
                encoding: 'utf8',
                timeout: 10000,
                ...options
            });
            return { success: true, output: output.trim() };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                stderr: error.stderr ? error.stderr.toString() : undefined,
            };
        }
    }

    checkTool(name, command, description) {
        console.log(`🔍 Checking ${name}...`);
        const result = this.executeCommand(command);

        if (result.success) {
            console.log(`  ✅ ${description}: ${result.output}`);
            return { installed: true, version: result.output };
        } else {
            console.log(`  ❌ ${description}: Not installed`);
            return { installed: false, error: result.error };
        }
    }

    checkClusterConnection() {
        console.log(`\n🔍 Checking Kubernetes cluster connection...`);

        const checks = [
            { name: 'Cluster Info', command: 'kubectl cluster-info' },
            { name: 'API Server', command: 'kubectl get --raw=/healthz' },
            { name: 'Nodes', command: 'kubectl get nodes' },
            { name: 'Namespaces', command: 'kubectl get namespaces' }
        ];

        for (const check of checks) {
            console.log(`  Checking ${check.name}...`);
            const result = this.executeCommand(check.command);

            if (result.success) {
                console.log(`    ✅ ${check.name}: Connected`);
            } else {
                console.log(`    ❌ ${check.name}: ${result.error}`);
            }
        }
    }

    checkHelmStatus() {
        console.log(`\n🔍 Checking Helm status...`);

        const checks = [
            { name: 'Helm Version', command: 'helm version --short' },
            { name: 'Helm Repos', command: 'helm repo list' },
            { name: 'Helm Releases', command: 'helm list --all-namespaces' }
        ];

        for (const check of checks) {
            console.log(`  Checking ${check.name}...`);
            const result = this.executeCommand(check.command);

            if (result.success) {
                console.log(`    ✅ ${check.name}: Available`);
                if (result.output) console.log(`       ${result.output}`);
            } else {
                console.log(`    ❌ ${check.name}: ${result.error}`);
            }
        }
    }

    checkMinikubeStatus() {
        console.log(`\n🔍 Checking Minikube status...`);

        const status = this.executeCommand('minikube status --format="{{json .}}"');

        if (status.success) {
            try {
                const parsed = JSON.parse(status.output);
                console.log(`  ✅ Minikube Status:`);
                console.log(`    Host: ${parsed.Host || 'Unknown'}`);
                console.log(`    Kubelet: ${parsed.Kubelet || 'Unknown'}`);
                console.log(`    API Server: ${parsed.APIServer || 'Unknown'}`);
                console.log(`    Kubeconfig: ${parsed.Kubeconfig || 'Unknown'}`);
            } catch (parseError) {
                console.log(`  ⚠️ Minikube: Failed to parse status (${parseError.message})`);
                console.log(`    Raw output: ${status.output}`);
            }
        } else {
            console.log(`  ❌ Minikube: ${status.error || 'Not running or not installed'}`);
            if (status.stderr) {
                console.log(`    Details: ${status.stderr}`);
            }
        }
    }

    checkEnvironmentVariables() {
        console.log(`\n🔍 Checking environment variables...`);

        const envVars = ['KUBECONFIG', 'KUBERNETES_MASTER', 'HELM_HOME', 'MINIKUBE_HOME'];

        for (const envVar of envVars) {
            const value = process.env[envVar];
            if (value) {
                console.log(`  ✅ ${envVar}: ${value}`);
            } else {
                console.log(`  ⚠️ ${envVar}: Not set`);
            }
        }
    }

    checkConfigurationFiles() {
        console.log(`\n🔍 Checking configuration files...`);

        const configFiles = [
            {
                name: 'kubectl config',
                path: this.isWindows
                    ? path.join(process.env.USERPROFILE, '.kube', 'config')
                    : path.join(process.env.HOME, '.kube', 'config')
            },
            {
                name: 'helm config',
                path: this.isWindows
                    ? path.join(process.env.USERPROFILE, '.helm')
                    : path.join(process.env.HOME, '.helm')
            }
        ];

        for (const config of configFiles) {
            if (fs.existsSync(config.path)) {
                const stats = fs.statSync(config.path);
                console.log(`  ✅ ${config.name}: ${config.path} (${stats.size} bytes)`);
            } else {
                console.log(`  ❌ ${config.name}: ${config.path} (not found)`);
            }
        }
    }

    run() {
        console.log('🚀 Wave Terminal Kubernetes Environment Check\n');
        console.log('This script checks your Kubernetes environment setup.\n');

        // Check tools
        const tools = [
            { name: 'kubectl', command: 'kubectl version --client --short', description: 'Kubernetes CLI' },
            { name: 'helm', command: 'helm version --short', description: 'Helm Package Manager' },
            { name: 'minikube', command: 'minikube version --short', description: 'Minikube Local Cluster' },
            { name: 'docker', command: this.isMac ? 'docker --version' : 'docker --version', description: 'Docker Container Runtime' }
        ];

        const results = {};
        for (const tool of tools) {
            results[tool.name] = this.checkTool(tool.name, tool.command, tool.description);
        }

        // Check cluster connection
        this.checkClusterConnection();

        // Check Helm status
        if (results.helm.installed) {
            this.checkHelmStatus();
        }

        // Check Minikube status
        if (results.minikube.installed) {
            this.checkMinikubeStatus();
        }

        // Check environment variables
        this.checkEnvironmentVariables();

        // Check configuration files
        this.checkConfigurationFiles();

        // Summary
        console.log(`\n📊 Summary:`);
        console.log(`✅ kubectl: ${results.kubectl.installed ? 'Ready' : 'Missing'}`);
        console.log(`✅ helm: ${results.helm.installed ? 'Ready' : 'Optional'}`);
        console.log(`✅ minikube: ${results.minikube.installed ? 'Ready' : 'Optional'}`);
        console.log(`✅ docker: ${results.docker.installed ? 'Ready' : 'Recommended'}`);

        if (results.kubectl.installed) {
            console.log(`\n💡 Ready to use Wave Terminal Kubernetes features!`);
            console.log(`   Launch Wave Terminal and try: kubectl get pods`);
        } else {
            console.log(`\n⚠️ kubectl is required for Kubernetes features.`);
            console.log(`   Run: npm run k8s:setup`);
        }
    }
}

// Run check if called directly
if (require.main === module) {
    const checker = new KubernetesChecker();
    checker.run();
}

module.exports = KubernetesChecker;
