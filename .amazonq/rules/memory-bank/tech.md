# Wave Terminal - Technology Stack

## Programming Languages & Versions

### Primary Languages
- **Go 1.24.6** - Backend services, CLI tools, and system integration
- **TypeScript/JavaScript** - Frontend application and build tooling
- **Python 3.x** - MCP servers and AI integration scripts
- **Shell/Bash** - System scripts and automation

### Frontend Stack
- **React 19.2.0** - UI framework with latest features
- **TypeScript 5.9.3** - Type-safe JavaScript development
- **Electron 31.3.1** - Cross-platform desktop application framework
- **Vite 5.4.2** - Fast build tool and development server

### Backend Stack
- **Go Standard Library** - Core backend functionality
- **SQLite** - Embedded database with migration support
- **WebSocket/HTTP** - Real-time and REST communication
- **Gorilla Mux** - HTTP routing and middleware

## Key Dependencies

### Frontend Dependencies
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "electron": "^31.3.1",
  "typescript": "^5.9.3",
  "vite": "^5.4.2",
  "@ai-sdk/react": "^2.0.81",
  "jotai": "2.9.3",
  "monaco-editor": "^0.52.0",
  "@xterm/xterm": "^5.5.0",
  "antd": "^5.27.6"
}
```

### Go Dependencies
```go
require (
  github.com/gorilla/websocket v1.5.3
  github.com/jmoiron/sqlx v1.4.0
  github.com/mattn/go-sqlite3 v1.14.32
  github.com/golang-migrate/migrate/v4 v4.19.0
  github.com/sashabaranov/go-openai v1.41.2
  github.com/google/generative-ai-go v0.20.1
  github.com/aws/aws-sdk-go-v2 v1.39.3
  github.com/spf13/cobra v1.10.1
)
```

## Build System & Tools

### Development Commands
```bash
# Frontend Development
npm run dev:frontend          # Vite development server
npm run dev:electron          # Electron development mode
npm run dev:storybook         # Component documentation

# Production Build
npm run build                 # Full production build
npm run build:renderer        # Frontend build only
npm run build:main           # Electron main process build

# Testing & Quality
npm run test                 # Run test suite
npm run lint                 # ESLint checking
npm run typecheck           # TypeScript validation

# Packaging & Distribution
npm run package:mac         # macOS distribution
npm run package:win         # Windows distribution
npm run package:linux       # Linux distribution
```

### Go Build Commands
```bash
# Server Development
go run cmd/server/main-server.go    # Start Wave server
go run cmd/wsh/main-wsh.go          # WSH utility

# Testing
go test ./...                       # Run all Go tests
go test -v ./pkg/...               # Verbose package tests

# Code Generation
go run cmd/generatego/main-generatego.go     # Generate Go code
go run cmd/generatets/main-generatets.go     # Generate TypeScript
go run cmd/generateschema/main-generateschema.go  # Generate schemas
```

### AI & MCP Commands
```bash
# MCP Server Management
npm run mcp:start              # Start MCP servers
npm run mcp:dev               # Development with MCP

# AI Agent Setup
npm run ai:setup              # Initialize AI agents
npm run ai:dev                # Development with AI
npm run agents:status         # Check agent status
```

### Kubernetes Integration
```bash
# Kubernetes Setup
npm run k8s:setup             # Setup Kubernetes tools
npm run k8s:check             # Check cluster status
npm run k8s:install-tools     # Install kubectl, helm, minikube
```

## Development Environment

### Required Tools
- **Node.js 18+** - JavaScript runtime for frontend development
- **Go 1.24.6+** - Backend development and CLI tools
- **Python 3.8+** - MCP servers and AI scripts
- **Git** - Version control
- **Docker** (optional) - Container development and testing

### IDE Configuration
- **EditorConfig** - Consistent coding style across editors
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **golangci-lint** - Go code linting and analysis

### Platform Support
- **macOS 11+** (arm64, x64) - Primary development platform
- **Windows 10 1809+** (x64) - Full feature support
- **Linux glibc-2.28+** (arm64, x64) - Ubuntu 20.04, RHEL 8, Debian 10

## Database & Storage

### Database System
- **SQLite 3** - Embedded database for local storage
- **Migration System** - golang-migrate for schema versioning
- **Two Databases**:
  - `wstore` - Main application data (workspaces, blocks, history)
  - `filestore` - File caching and preview data

### Configuration Management
- **JSON Schema** - Structured configuration validation
- **File Watcher** - Real-time configuration updates
- **Default Configs** - Sensible defaults with user overrides

## AI & Integration Technologies

### AI Providers
- **OpenAI API** - GPT models and chat completion
- **Anthropic Claude** - Advanced reasoning and analysis
- **Google Gemini** - Multimodal AI capabilities
- **Perplexity** - Web-enhanced AI responses
- **Ollama** - Local AI model execution

### MCP (Model Context Protocol)
- **Server Framework** - Extensible AI tool integration
- **Multiple Languages** - JavaScript, Python, and Go implementations
- **Specialized Servers** - Filesystem, terminal, memory, Kubernetes

### Communication Protocols
- **WebSocket** - Real-time bidirectional communication
- **Server-Sent Events** - Streaming AI responses
- **HTTP/REST** - Standard API communication
- **RPC** - Remote procedure calls for WSH system