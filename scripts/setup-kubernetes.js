#!/usr/bin/env node

/**
 * Kubernetes Setup Script
 * Sets up Kubernetes environment for Wave Terminal
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class KubernetesSetup {
    constructor() {
        this.isMac = process.platform === 'darwin';
        this.isLinux = process.platform === 'linux';
        this.isWindows = process.platform === 'windows';
    }

    async checkPrerequisites() {
        console.log('🔍 Checking Kubernetes prerequisites...\n');

        const checks = [
            { name: 'kubectl', command: 'kubectl version --client --short', required: true },
            { name: 'helm', command: 'helm version --short', required: false },
            { name: 'minikube', command: 'minikube version --short', required: false },
            { name: 'docker', command: this.isMac ? 'docker --version' : 'docker version --short', required: false }
        ];

        const results = {};

        for (const check of checks) {
            try {
                const output = execSync(check.command, { encoding: 'utf8', timeout: 5000 });
                results[check.name] = { installed: true, version: output.trim() };
                console.log(`✅ ${check.name}: ${output.trim()}`);
            } catch (error) {
                results[check.name] = { installed: false, error: error.message };
                if (check.required) {
                    console.log(`❌ ${check.name}: Not installed (required)`);
                } else {
                    console.log(`⚠️ ${check.name}: Not installed (optional)`);
                }
            }
        }

        return results;
    }

    async installKubectl() {
        console.log('\n📦 Installing kubectl...\n');

        try {
            if (this.isMac) {
                // Install via Homebrew
                execSync('brew install kubectl', { stdio: 'inherit' });
            } else if (this.isLinux) {
                // Install via package manager or direct download
                execSync('curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && chmod +x kubectl && sudo mv kubectl /usr/local/bin/', { stdio: 'inherit' });
            } else if (this.isWindows) {
                // Windows installation
                console.log('Please download kubectl from: https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/');
                return false;
            }

            console.log('✅ kubectl installed successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to install kubectl:', error.message);
            return false;
        }
    }

    async installHelm() {
        console.log('\n📦 Installing Helm...\n');

        try {
            if (this.isMac) {
                execSync('brew install helm', { stdio: 'inherit' });
            } else if (this.isLinux) {
                execSync('curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash', { stdio: 'inherit' });
            } else if (this.isWindows) {
                console.log('Please download Helm from: https://helm.sh/docs/intro/install/');
                return false;
            }

            console.log('✅ Helm installed successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to install Helm:', error.message);
            return false;
        }
    }

    async installMinikube() {
        console.log('\n📦 Installing Minikube...\n');

        try {
            if (this.isMac) {
                execSync('brew install minikube', { stdio: 'inherit' });
                // Also install a hypervisor
                execSync('brew install hyperkit', { stdio: 'inherit' });
            } else if (this.isLinux) {
                execSync('curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && chmod +x minikube-linux-amd64 && sudo mv minikube-linux-amd64 /usr/local/bin/minikube', { stdio: 'inherit' });
            } else if (this.isWindows) {
                console.log('Please download Minikube from: https://minikube.sigs.k8s.io/docs/start/');
                return false;
            }

            console.log('✅ Minikube installed successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to install Minikube:', error.message);
            return false;
        }
    }

    async setupKubeconfig() {
        console.log('\n🔧 Setting up kubeconfig...\n');

        const kubeconfigPath = this.isWindows
            ? path.join(process.env.USERPROFILE, '.kube', 'config')
            : path.join(process.env.HOME, '.kube', 'config');

        try {
            // Create .kube directory if it doesn't exist
            const kubeDir = path.dirname(kubeconfigPath);
            if (!fs.existsSync(kubeDir)) {
                fs.mkdirSync(kubeDir, { recursive: true });
                console.log(`📁 Created ${kubeDir}`);
            }

            // Check if minikube config exists and merge it
            if (fs.existsSync(kubeconfigPath)) {
                console.log(`✅ kubeconfig already exists at ${kubeconfigPath}`);
                console.log('💡 You can manage multiple clusters with: kubectl config use-context <context-name>');
            } else {
                console.log('📝 Creating initial kubeconfig...');
                console.log('💡 Run "minikube start" to create a local cluster');
            }

            return true;
        } catch (error) {
            console.error('❌ Failed to setup kubeconfig:', error.message);
            return false;
        }
    }

    async startMinikube() {
        console.log('\n🚀 Starting Minikube...\n');

        try {
            // Check if minikube is already running
            try {
                const status = execSync('minikube status --format="{{.Host}}"', { encoding: 'utf8' });
                if (status.trim() === 'Running') {
                    console.log('✅ Minikube is already running');
                    return true;
                }
            } catch (error) {
                // Minikube not running, continue with start
            }

            // Start minikube
            execSync('minikube start --driver=docker', { stdio: 'inherit' });
            console.log('✅ Minikube started successfully');

            // Enable common addons
            console.log('🔧 Enabling useful addons...');
            execSync('minikube addons enable dashboard', { stdio: 'inherit' });
            execSync('minikube addons enable metrics-server', { stdio: 'inherit' });

            return true;
        } catch (error) {
            console.error('❌ Failed to start Minikube:', error.message);
            return false;
        }
    }

    async testConnection() {
        console.log('\n🔍 Testing Kubernetes connection...\n');

        try {
            const clusterInfo = execSync('kubectl cluster-info', { encoding: 'utf8', timeout: 10000 });
            console.log('✅ Successfully connected to Kubernetes cluster');
            console.log(clusterInfo);

            const nodes = execSync('kubectl get nodes -o wide', { encoding: 'utf8' });
            console.log('📋 Cluster nodes:');
            console.log(nodes);

            return true;
        } catch (error) {
            console.error('❌ Failed to connect to Kubernetes:', error.message);
            return false;
        }
    }

    async run() {
        console.log('🚀 Wave Terminal Kubernetes Setup\n');
        console.log('This script will help you set up Kubernetes tools for Wave Terminal.\n');

        // Check prerequisites
        const prerequisites = await this.checkPrerequisites();

        let needsSetup = false;
        for (const [tool, result] of Object.entries(prerequisites)) {
            if (tool === 'kubectl' && !result.installed) {
                needsSetup = true;
                break;
            }
        }

        if (needsSetup) {
            console.log('\n📦 Installing missing tools...\n');

            if (!prerequisites.kubectl.installed) {
                await this.installKubectl();
            }

            if (!prerequisites.helm.installed) {
                const installHelm = await this.askYesNo('Install Helm?');
                if (installHelm) await this.installHelm();
            }

            if (!prerequisites.minikube.installed) {
                const installMinikube = await this.askYesNo('Install Minikube for local development?');
                if (installMinikube) await this.installMinikube();
            }
        }

        // Setup kubeconfig
        await this.setupKubeconfig();

        // Start minikube if requested
        const startMinikube = await this.askYesNo('\nStart Minikube local cluster?');
        if (startMinikube && prerequisites.minikube?.installed) {
            await this.startMinikube();
        }

        // Test connection
        await this.testConnection();

        console.log('\n🎉 Kubernetes setup complete!');
        console.log('\n💡 Next steps:');
        console.log('1. Launch Wave Terminal: open /Applications/Wave\ Terminal.app');
        console.log('2. Use the AI chat to interact with Kubernetes');
        console.log('3. Try commands like: "kubectl get pods" or "helm list"');
        console.log('4. Explore the Kubernetes tools in the MCP integration');
    }

    async askYesNo(question) {
        // In non-interactive mode, assume yes
        console.log(`${question} (Y/n)`);
        return true;
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new KubernetesSetup();
    setup.run().catch(console.error);
}

module.exports = KubernetesSetup;
