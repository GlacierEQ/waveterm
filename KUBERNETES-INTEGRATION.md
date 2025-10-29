# Kubernetes Integration for Wave Terminal

Wave Terminal now includes comprehensive Kubernetes integration with kubectl, Helm, and Minikube support through the MCP (Multi-Connection Protocol) server architecture.

## 🚀 Features

### ☸️ kubectl MCP Server (Port 3003)
- **Cluster Management**: Get cluster info, node status, and cluster health
- **Pod Operations**: List, describe, and manage pods across namespaces
- **Deployment Management**: Monitor and manage Kubernetes deployments
- **Service Operations**: Manage and inspect Kubernetes services
- **Log Retrieval**: Get logs from pods with filtering and tail options
- **Resource Description**: Detailed describe operations for any resource

### 📦 Helm MCP Server (Port 3004)
- **Chart Management**: Search, install, and manage Helm charts
- **Release Management**: List, upgrade, and uninstall Helm releases
- **Repository Operations**: Manage Helm repositories and charts
- **Template Generation**: Generate Kubernetes manifests from Helm templates
- **Package Linting**: Validate Helm charts before deployment
- **Values Management**: Get and set values for Helm releases

### 🚀 Minikube MCP Server (Port 3005)
- **Local Development**: Start, stop, and manage local Kubernetes clusters
- **Service Tunneling**: Expose services from minikube to localhost
- **Addon Management**: Enable and disable minikube addons
- **Configuration Management**: Get and set minikube configuration
- **SSH Access**: Execute commands directly on minikube nodes
- **Log Management**: View minikube logs and status

## 🛡️ Security Features

- **Namespace Restrictions**: Configurable allowed namespaces via `ALLOWED_NAMESPACES` environment variable
- **Input Validation**: Comprehensive sanitization of all Kubernetes commands and parameters
- **Command Filtering**: Blocks dangerous command patterns and shell injection attempts
- **Resource Name Validation**: Ensures Kubernetes resource names follow proper conventions
- **Timeout Protection**: Maximum execution time limits for all operations

## 📦 Installation

### Prerequisites
- **kubectl**: Kubernetes command-line tool
- **helm**: Kubernetes package manager (optional)
- **minikube**: Local Kubernetes development (optional)
- **docker**: Container runtime (required for minikube)

### Quick Setup
```bash
# Check current Kubernetes environment
npm run k8s:check

# Install Kubernetes tools
npm run k8s:install-tools

# Setup Kubernetes environment
npm run k8s:setup

# Start minikube (optional)
minikube start
```

### Build Installers With MCP Services
```bash
# Install dependencies and build frontend
npm install
npm run build

# Create platform installers that bundle the Kubernetes MCP servers
npm run package:mac     # macOS universal DMG + ZIP
npm run package:win     # Windows NSIS + portable ZIP
npm run package:linux   # Linux AppImage + deb + rpm
```

Installer artifacts are written to `release/<version>/`. When you start a packaged build, the embedded MCP server manager boots automatically and exposes kubectl, Helm, and Minikube endpoints without extra setup.

## 🎯 Usage

### Launch Wave Terminal
```bash
# Launch the enhanced Wave Terminal
open /Applications/Wave\ Terminal.app

# Or use Spotlight
⌘ + Space → "Wave Terminal" → Enter
```

### Kubernetes Operations via AI Chat
The Kubernetes tools are integrated into the AI chat system. You can now ask:

```
"Show me all pods in the default namespace"
"Deploy nginx using helm"
"Check the status of my minikube cluster"
"Get logs from the web-app pod"
"Scale the deployment to 3 replicas"
"Show me all services in production namespace"
```

### Direct kubectl Commands
Traditional kubectl commands work as expected:
```bash
kubectl get pods
kubectl get deployments -o yaml
helm list --all-namespaces
minikube service web-app --url
```

## 🔧 Configuration

### Environment Variables
```bash
# Restrict to specific namespaces (comma-separated)
export ALLOWED_NAMESPACES="default,production,staging"

# Set kubeconfig path
export KUBECONFIG=$HOME/.kube/config

# Minikube configuration
export MINIKUBE_HOME=$HOME/.minikube
```

### Namespace Restrictions
Create a `.env` file or set environment variables:
```bash
# Allow only specific namespaces
ALLOWED_NAMESPACES="default,kube-system,production"

# Or allow all namespaces (less secure)
# ALLOWED_NAMESPACES=""
```

## 📋 Available Tools

### kubectl Tools
- **cluster_management**: Cluster information and status
- **pod_operations**: Pod lifecycle management
- **deployment_management**: Deployment operations
- **service_operations**: Service management
- **logs**: Pod log retrieval
- **describe**: Resource descriptions

### Helm Tools
- **chart_management**: Chart search and management
- **release_management**: Release lifecycle
- **package_operations**: Chart packaging
- **template_generation**: Manifest generation

### Minikube Tools
- **local_cluster**: Cluster management
- **development_environment**: Development setup
- **service_tunneling**: Service exposure
- **addon_management**: Feature management

## 🚨 Security Best Practices

1. **Namespace Isolation**: Use namespace restrictions in production
2. **Resource Limits**: Monitor resource usage and set appropriate limits
3. **Access Controls**: Use RBAC (Role-Based Access Control) properly
4. **Audit Logs**: Enable audit logging for compliance
5. **Network Policies**: Implement network segmentation

## 🐛 Troubleshooting

### Common Issues

**"kubectl not found"**
```bash
# Install kubectl
npm run k8s:install-tools
# or
brew install kubectl  # macOS
```

**"No cluster connection"**
```bash
# Check cluster status
kubectl cluster-info

# Start minikube
minikube start

# Check kubeconfig
kubectl config current-context
```

**"Namespace not allowed"**
```bash
# Check environment variables
echo $ALLOWED_NAMESPACES

# Update allowed namespaces
export ALLOWED_NAMESPACES="default,your-namespace"
```

**MCP Servers not starting**
```bash
# Check if ports are available
netstat -an | grep 300[3-5]

# Start servers manually
npm run mcp:k8s
```

## 📚 Examples

### Basic Cluster Operations
```bash
# Get cluster information
kubectl cluster-info

# List all pods
kubectl get pods --all-namespaces

# Get deployment status
kubectl get deployments -o wide
```

### Helm Package Management
```bash
# List installed releases
helm list --all-namespaces

# Search for charts
helm search repo nginx

# Install a chart
helm install web-app bitnami/nginx
```

### Minikube Development
```bash
# Start local cluster
minikube start

# Enable dashboard
minikube dashboard

# Expose service
minikube service web-app --url
```

## 🎉 What's New

| Feature | Before | After |
|---------|--------|--------|
| **Kubernetes Support** | None | Full kubectl/helm/minikube integration |
| **AI Integration** | Basic chat | Kubernetes-aware AI assistance |
| **Security** | Standard | Enhanced with namespace restrictions |
| **Development** | Manual setup | Automated with setup scripts |
| **Package Management** | External tools | Integrated Helm management |
| **Local Development** | Separate workflow | Integrated minikube support |

## 🔄 Updates

The Kubernetes integration is automatically included in all Wave Terminal updates. The MCP servers will start automatically when you launch the application.

For the latest features and improvements, check the [Wave Terminal documentation](https://www.waveterm.dev).

---

**Happy Kubernetes development with Wave Terminal!** 🚀☸️
