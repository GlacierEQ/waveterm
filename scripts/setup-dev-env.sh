#!/bin/bash

# Wave Terminal Development Environment Setup Script
# This script sets up the development environment for Wave Terminal

echo "🚀 Setting up Wave Terminal development environment..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "🍺 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add Homebrew to PATH
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
else
    echo "✅ Homebrew is already installed"
fi

# Install Node.js using nvm (Node Version Manager)
if ! command -v nvm &> /dev/null; then
    echo "📦 Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    # Install Node.js LTS
    echo "⬇️  Installing Node.js LTS..."
    nvm install --lts
    nvm use --lts
else
    echo "✅ nvm is already installed"
    nvm use --lts 2>/dev/null || nvm install --lts
fi

# Install Yarn
if ! command -v yarn &> /dev/null; then
    echo "🧶 Installing Yarn..."
    npm install -g yarn
else
    echo "✅ Yarn is already installed"
fi

# Install project dependencies
echo "📦 Installing project dependencies..."
cd "$(dirname "$0")/.."
yarn install

# Install MCP server dependencies
if [ -d "mcp-servers" ]; then
    echo "⚙️  Installing MCP server dependencies..."
    cd mcp-servers
    yarn install || npm install
    cd ..
fi

# Verify installations
echo "\n🔍 Verifying installations..."
node --version
yarn --version

# Set up environment variables
if [ ! -f ".env" ]; then
    echo "\n⚙️  Creating .env file..."
    cat > .env <<EOL
# Wave Terminal Environment Variables
NODE_ENV=development

# MCP Server Configuration
MCP_MEMORY_PORT=13000
MCP_FILESYSTEM_PORT=13001
MCP_TERMINAL_PORT=13002
MCP_KUBECTL_PORT=13003
MCP_HELM_PORT=13004
MCP_MINIKUBE_PORT=13005

# Kubernetes Configuration
KUBECONFIG=~/.kube/config

# Optional: Uncomment and set your API keys
# OPENAI_API_KEY=your_openai_api_key
# ANTHROPIC_API_KEY=your_anthropic_api_key
# AWS_ACCESS_KEY_ID=your_aws_access_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret_key
EOL
    echo "✅ Created .env file"
else
    echo "✅ .env file already exists"
fi

echo "\n🎉 Setup complete! You can now start developing Wave Terminal."
echo "To start the development environment, run: yarn dev"
echo "To run the MCP integration tests: yarn test:mcp"
