#!/usr/bin/env node

/**
 * Kubernetes Tools Installation Script
 * Installs kubectl, helm, minikube and other Kubernetes tools
 */

const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

class KubernetesToolsInstaller {
    constructor() {
        this.isMac = process.platform === 'darwin';
        this.isLinux = process.platform === 'linux';
        this.isWindows = process.platform === 'windows';
        this.tools = {
            kubectl: {
                version: 'latest',
                installMethod: this.getInstallMethod('kubectl')
            },
            helm: {
                version: 'latest',
                installMethod: this.getInstallMethod('helm')
            },
            minikube: {
                version: 'latest',
                installMethod: this.getInstallMethod('minikube')
            }
        };
    }

    getInstallMethod(tool) {
        if (this.isMac) {
            return 'homebrew';
        } else if (this.isLinux) {
            return 'direct';
        } else if (this.isWindows) {
            return 'manual';
        }
        return 'unknown';
    }

    async downloadFile(url, destination) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(destination);

            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                    return;
                }

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    fs.chmodSync(destination, '755');
                    resolve();
                });

                file.on('error', (error) => {
                    fs.unlinkSync(destination);
                    reject(error);
                });
            }).on('error', reject);
        });
    }

    installKubectl() {
        console.log('\n📦 Installing kubectl...\n');

        try {
            if (this.isMac) {
                execSync('brew install kubectl', { stdio: 'inherit' });
            } else if (this.isLinux) {
                // Get latest stable version
                const version = execSync('curl -L -s https://dl.k8s.io/release/stable.txt', { encoding: 'utf8' }).trim();
                const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';

                console.log(`Downloading kubectl ${version} for Linux ${arch}...`);
                this.downloadFile(
                    `https://dl.k8s.io/release/${version}/bin/linux/${arch}/kubectl`,
                    '/tmp/kubectl'
                );

                execSync('sudo mv /tmp/kubectl /usr/local/bin/kubectl', { stdio: 'inherit' });
            } else if (this.isWindows) {
                console.log('Please download kubectl from: https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/');
                return;
            }

            console.log('✅ kubectl installed successfully');

            // Verify installation
            try {
                const version = execSync('kubectl version --client --short', { encoding: 'utf8' });
                console.log(`   Version: ${version.trim()}`);
            } catch (error) {
                console.log('   ⚠️ kubectl installed but may need PATH update');
            }

        } catch (error) {
            console.error('❌ Failed to install kubectl:', error.message);
        }
    }

    installHelm() {
        console.log('\n📦 Installing Helm...\n');

        try {
            if (this.isMac) {
                execSync('brew install helm', { stdio: 'inherit' });
            } else if (this.isLinux) {
                console.log('Installing Helm via script...');
                execSync('curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash', { stdio: 'inherit' });
            } else if (this.isWindows) {
                console.log('Please download Helm from: https://helm.sh/docs/intro/install/');
                return;
            }

            console.log('✅ Helm installed successfully');

            // Verify installation
            try {
                const version = execSync('helm version --short', { encoding: 'utf8' });
                console.log(`   Version: ${version.trim()}`);
            } catch (error) {
                console.log('   ⚠️ Helm installed but may need PATH update');
            }

        } catch (error) {
            console.error('❌ Failed to install Helm:', error.message);
        }
    }

    installMinikube() {
        console.log('\n📦 Installing Minikube...\n');

        try {
            if (this.isMac) {
                execSync('brew install minikube', { stdio: 'inherit' });
                // Install hypervisor
                execSync('brew install hyperkit', { stdio: 'inherit' });
            } else if (this.isLinux) {
                const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
                const url = `https://storage.googleapis.com/minikube/releases/latest/minikube-linux-${arch}`;

                console.log(`Downloading minikube for Linux ${arch}...`);
                this.downloadFile(url, '/tmp/minikube');

                execSync('sudo mv /tmp/minikube /usr/local/bin/minikube', { stdio: 'inherit' });
            } else if (this.isWindows) {
                console.log('Please download Minikube from: https://minikube.sigs.k8s.io/docs/start/');
                return;
            }

            console.log('✅ Minikube installed successfully');

            // Verify installation
            try {
                const version = execSync('minikube version --short', { encoding: 'utf8' });
                console.log(`   Version: ${version.trim()}`);
            } catch (error) {
                console.log('   ⚠️ Minikube installed but may need PATH update');
            }

        } catch (error) {
            console.error('❌ Failed to install Minikube:', error.message);
        }
    }

    installDocker() {
        console.log('\n📦 Installing Docker...\n');

        try {
            if (this.isMac) {
                console.log('Installing Docker Desktop for Mac...');
                console.log('Please download from: https://docs.docker.com/desktop/install/mac-install/');
                return;
            } else if (this.isLinux) {
                console.log('Installing Docker via package manager...');
                execSync('sudo apt-get update && sudo apt-get install -y docker.io', { stdio: 'inherit' });
                execSync('sudo systemctl start docker && sudo systemctl enable docker', { stdio: 'inherit' });
            } else if (this.isWindows) {
                console.log('Please download Docker Desktop from: https://docs.docker.com/desktop/install/windows-install/');
                return;
            }

            console.log('✅ Docker installed successfully');

            // Verify installation
            try {
                const version = execSync('docker --version', { encoding: 'utf8' });
                console.log(`   Version: ${version.trim()}`);
            } catch (error) {
                console.log('   ⚠️ Docker installed but may need restart or PATH update');
            }

        } catch (error) {
            console.error('❌ Failed to install Docker:', error.message);
        }
    }

    setupEnvironment() {
        console.log('\n🔧 Setting up environment...\n');

        // Create .kube directory
        const kubeDir = this.isWindows
            ? path.join(process.env.USERPROFILE, '.kube')
            : path.join(process.env.HOME, '.kube');

        if (!fs.existsSync(kubeDir)) {
            fs.mkdirSync(kubeDir, { recursive: true });
            console.log(`✅ Created ${kubeDir}`);
        }

        // Set environment variables
        const envFile = this.isWindows
            ? path.join(process.env.USERPROFILE, '.bashrc')
            : path.join(process.env.HOME, '.bashrc');

        let envContent = '';
        if (fs.existsSync(envFile)) {
            envContent = fs.readFileSync(envFile, 'utf8');
        }

        const envVars = [
            'export KUBECONFIG=$HOME/.kube/config',
            'export HELM_HOME=$HOME/.helm',
            'export MINIKUBE_HOME=$HOME/.minikube'
        ];

        let needsUpdate = false;
        for (const envVar of envVars) {
            if (!envContent.includes(envVar)) {
                envContent += '\n' + envVar;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            fs.writeFileSync(envFile, envContent);
            console.log(`✅ Updated ${envFile} with Kubernetes environment variables`);
        }

        // Setup autocomplete
        try {
            if (this.isMac || this.isLinux) {
                execSync('kubectl completion bash > ~/.kube/completion.bash.inc', { stdio: 'inherit' });
                console.log('✅ kubectl bash completion installed');
            }
        } catch (error) {
            console.log('⚠️ Could not install kubectl completion');
        }
    }

    async run() {
        console.log('🚀 Kubernetes Tools Installation\n');
        console.log('This script will install kubectl, helm, minikube, and other Kubernetes tools.\n');

        const toolsToInstall = ['kubectl', 'helm', 'minikube'];

        for (const tool of toolsToInstall) {
            const shouldInstall = await this.askYesNo(`Install ${tool}?`);
            if (shouldInstall) {
                switch (tool) {
                    case 'kubectl':
                        this.installKubectl();
                        break;
                    case 'helm':
                        this.installHelm();
                        break;
                    case 'minikube':
                        this.installMinikube();
                        break;
                }
            }
        }

        // Offer to install Docker
        const installDocker = await this.askYesNo('\nInstall Docker (required for minikube)?');
        if (installDocker) {
            this.installDocker();
        }

        // Setup environment
        this.setupEnvironment();

        console.log('\n🎉 Installation complete!');
        console.log('\n💡 Next steps:');
        console.log('1. Run: npm run k8s:check (to verify installation)');
        console.log('2. Run: npm run k8s:setup (to setup your environment)');
        console.log('3. Launch Wave Terminal and start using Kubernetes features!');
    }

    async askYesNo(question) {
        // In non-interactive mode, assume yes for essential tools
        console.log(`${question} (Y/n)`);
        return true;
    }
}

// Run installation if called directly
if (require.main === module) {
    const installer = new KubernetesToolsInstaller();
    installer.run().catch(console.error);
}

module.exports = KubernetesToolsInstaller;
